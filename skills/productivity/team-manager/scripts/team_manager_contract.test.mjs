import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';

import { TeamManagerEventStore, normalizeTeamManagerEvent } from './team_manager_contract.js';

test('normalizes a bridge inbound message into the Team Manager contract', () => {
  assert.deepEqual(normalizeTeamManagerEvent({
    profileId: 'client-a',
    chatId: '628111111111@s.whatsapp.net',
    senderId: '628111111111@s.whatsapp.net',
    messageId: 'msg-001',
    text: 'Laporan selesai',
  }), {
    profileId: 'client-a',
    chatId: '628111111111@s.whatsapp.net',
    senderId: '628111111111@s.whatsapp.net',
    messageId: 'msg-001',
    text: 'Laporan selesai',
    receivedAt: null,
  });
});

test('rejects a malformed Team Manager event at the contract boundary', () => {
  assert.throws(
    () => normalizeTeamManagerEvent({ profileId: 'client-a', chatId: 'chat', text: 'tanpa sender' }),
    /senderId and messageId are required/,
  );
});

test('writes events only to the active profile workspace', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-team-manager-'));
  try {
    const a = new TeamManagerEventStore({ profileId: 'client-a', rootDir: root });
    const b = new TeamManagerEventStore({ profileId: 'client-b', rootDir: root });
    a.append({ profileId: 'client-a', chatId: 'chat-a', senderId: 'sender-a', messageId: 'msg-a', text: 'A' });

    assert.match(readFileSync(path.join(root, 'client-a', 'team-manager-events.jsonl'), 'utf8'), /"msg-a"/);
    assert.deepEqual(b.read(), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('refuses an event whose profile differs from the store profile', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-team-manager-'));
  try {
    const store = new TeamManagerEventStore({ profileId: 'client-a', rootDir: root });
    assert.throws(
      () => store.append({ profileId: 'client-b', chatId: 'chat-b', senderId: 'sender-b', messageId: 'msg-b', text: 'B' }),
      /profile mismatch/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
