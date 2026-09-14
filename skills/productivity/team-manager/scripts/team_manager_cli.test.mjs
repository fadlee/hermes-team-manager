import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

import { run } from './team_manager_cli.js';
import { TeamManagerEventStore } from './team_manager_contract.js';

test('queue-draft then handle-owner across two separate invocations sends the approved draft', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-cli-'));
  try {
    const opts = { rootDir: root, profileId: 'demo-usaha', ownerId: 'owner' };

    const queued = await run(['queue-draft', '--employee', 'budi', '--instruction', 'Cek stok beras'], opts);
    assert.equal(queued.pendingDrafts, 1);

    const approved = await run(['handle-owner', '--text', 'approve'], opts);
    assert.deepEqual(approved.sent, [{ chatId: 'budi', text: 'Cek stok beras' }]);
    assert.equal(approved.pendingDrafts, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('process-inbound reads bridge-captured events and escalates urgent ones, then never re-processes them', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-cli-'));
  try {
    const opts = { rootDir: root, profileId: 'demo-usaha', ownerId: 'owner' };
    const eventStore = new TeamManagerEventStore({ profileId: 'demo-usaha', rootDir: root });
    eventStore.append({
      profileId: 'demo-usaha', chatId: 'chat', senderId: '6281', messageId: 'm1', text: 'URGENT: listrik mati',
    });

    const first = await run(['process-inbound', '--employees', JSON.stringify({ 6281: 'budi' })], opts);
    assert.equal(first.processed, 1);
    assert.deepEqual(first.sent, [{ chatId: 'owner', text: 'URGENT dari budi: URGENT: listrik mati' }]);

    const second = await run(['process-inbound', '--employees', JSON.stringify({ 6281: 'budi' })], opts);
    assert.equal(second.processed, 0);
    assert.deepEqual(second.sent, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('process-inbound records an unknown sender without leaking company data', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-cli-'));
  try {
    const opts = { rootDir: root, profileId: 'demo-usaha', ownerId: 'owner' };
    const eventStore = new TeamManagerEventStore({ profileId: 'demo-usaha', rootDir: root });
    eventStore.append({
      profileId: 'demo-usaha', chatId: 'chat', senderId: '6299', messageId: 'm1', text: 'Halo ini siapa',
    });

    const result = await run(['process-inbound', '--employees', JSON.stringify({})], opts);
    assert.deepEqual(result.sent, []);
    assert.deepEqual(result.unidentifiedSenders, [{ senderId: '6299', text: 'Halo ini siapa' }]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('two profiles stay isolated through the same CLI', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-cli-'));
  try {
    await run(['queue-draft', '--employee', 'budi', '--instruction', 'Cek stok'], { rootDir: root, profileId: 'client-a', ownerId: 'owner-a' });
    const statusB = await run(['status'], { rootDir: root, profileId: 'client-b', ownerId: 'owner-b' });
    assert.equal(statusB.pendingDrafts, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
