import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

import { FakeWhatsAppAdapter } from './fake_whatsapp_adapter.js';
import { TeamManagerFlow } from './team_manager_flow.js';
import { TeamManagerDraftStore } from './team_manager_draft_store.js';

test('holds instructions until the owner explicitly approves the whole draft', async () => {
  const wa = new FakeWhatsAppAdapter();
  const flow = new TeamManagerFlow({ ownerId: 'owner', adapter: wa });

  await flow.queueDraft('budi', ['Cek stok']);
  await flow.handleOwnerMessage('nanti');
  assert.deepEqual(wa.sent(), []);

  await flow.handleOwnerMessage('approve');
  assert.deepEqual(wa.sent(), [{ chatId: 'budi', text: 'Cek stok' }]);
});

test('requires a confirmation after a partial owner revision', async () => {
  const wa = new FakeWhatsAppAdapter();
  const flow = new TeamManagerFlow({ ownerId: 'owner', adapter: wa });

  await flow.queueDraft('budi', ['Cek stok', 'Bersihkan rak']);
  await flow.handleOwnerMessage('budi skip poin 2, sisanya oke');
  assert.deepEqual(wa.sent(), [{
    chatId: 'owner',
    text: 'Konfirmasi: Budi poin 2 dihapus; kirim 1 instruksi sekarang?',
  }]);

  await flow.handleOwnerMessage('ya');
  assert.deepEqual(wa.sent().slice(1), [{ chatId: 'budi', text: 'Cek stok' }]);
});

test('records an unknown sender without sending company data', async () => {
  const wa = new FakeWhatsAppAdapter();
  const flow = new TeamManagerFlow({
    ownerId: 'owner',
    adapter: wa,
    employees: { '628111111111': 'budi' },
  });

  await flow.handleEmployeeMessage({ senderId: '628999999999', text: 'Saya Budi' });

  assert.deepEqual(flow.unidentifiedSenders(), [{ senderId: '628999999999', text: 'Saya Budi' }]);
  assert.deepEqual(wa.sent(), []);
});

test('escalates an urgent employee report only to the owner', async () => {
  const wa = new FakeWhatsAppAdapter();
  const flow = new TeamManagerFlow({
    ownerId: 'owner',
    adapter: wa,
    employees: { '628111111111': 'budi' },
  });

  await flow.handleEmployeeMessage({ senderId: '628111111111', text: 'URGENT: listrik mati' });

  assert.deepEqual(wa.sent(), [{
    chatId: 'owner',
    text: 'URGENT dari budi: URGENT: listrik mati',
  }]);
});

test('keeps messages isolated between client flows', async () => {
  const a = new FakeWhatsAppAdapter();
  const b = new FakeWhatsAppAdapter();
  const clientA = new TeamManagerFlow({ ownerId: 'owner-a', adapter: a });
  const clientB = new TeamManagerFlow({ ownerId: 'owner-b', adapter: b });

  await clientA.queueDraft('budi', ['Cek stok']);
  await clientA.handleOwnerMessage('approve');

  assert.deepEqual(a.sent(), [{ chatId: 'budi', text: 'Cek stok' }]);
  assert.deepEqual(b.sent(), []);
  assert.equal(clientB.pendingDrafts(), 0);
});

test('survives a process restart: a cron process queues a draft, a later process sends it after approval', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-drafts-'));
  try {
    const store1 = new TeamManagerDraftStore({ profileId: 'demo-usaha', rootDir: root });
    const wa1 = new FakeWhatsAppAdapter();
    const morningFlow = new TeamManagerFlow({ ownerId: 'owner', adapter: wa1, store: store1 });
    await morningFlow.queueDraft('budi', ['Cek stok beras']);
    assert.equal(morningFlow.pendingDrafts(), 1);

    const store2 = new TeamManagerDraftStore({ profileId: 'demo-usaha', rootDir: root });
    const wa2 = new FakeWhatsAppAdapter();
    const gatewayFlow = new TeamManagerFlow({ ownerId: 'owner', adapter: wa2, store: store2 });
    assert.equal(gatewayFlow.pendingDrafts(), 1, 'draft must survive across process instances');

    await gatewayFlow.handleOwnerMessage('approve');
    assert.deepEqual(wa2.sent(), [{ chatId: 'budi', text: 'Cek stok beras' }]);
    assert.equal(gatewayFlow.pendingDrafts(), 0);

    const store3 = new TeamManagerDraftStore({ profileId: 'demo-usaha', rootDir: root });
    const freshFlow = new TeamManagerFlow({ ownerId: 'owner', adapter: new FakeWhatsAppAdapter(), store: store3 });
    assert.equal(freshFlow.pendingDrafts(), 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('two profiles never see each other\'s persisted drafts', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-drafts-'));
  try {
    const storeA = new TeamManagerDraftStore({ profileId: 'client-a', rootDir: root });
    const flowA = new TeamManagerFlow({ ownerId: 'owner-a', adapter: new FakeWhatsAppAdapter(), store: storeA });
    await flowA.queueDraft('budi', ['Cek stok']);

    const storeB = new TeamManagerDraftStore({ profileId: 'client-b', rootDir: root });
    const flowB = new TeamManagerFlow({ ownerId: 'owner-b', adapter: new FakeWhatsAppAdapter(), store: storeB });
    assert.equal(flowB.pendingDrafts(), 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
