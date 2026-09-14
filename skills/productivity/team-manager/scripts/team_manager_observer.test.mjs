import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

import { createTeamManagerObserver } from './team_manager_observer.js';

test('is disabled unless an explicit profile id is configured', () => {
  const observer = createTeamManagerObserver({ rootDir: '/tmp/unused' });
  assert.equal(observer.enabled, false);
  assert.equal(observer.observe({ chatId: 'chat', senderId: 'sender', messageId: 'id', text: 'hi' }), null);
});

test('persists only inbound non-empty events and never sends messages', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-observer-'));
  try {
    const observer = createTeamManagerObserver({ profileId: 'client-a', rootDir: root });
    assert.equal(observer.observe({ chatId: 'chat', senderId: 'sender', messageId: 'id-1', text: 'laporan', fromMe: false }), true);
    assert.equal(observer.observe({ chatId: 'chat', senderId: 'sender', messageId: 'id-2', text: 'owner typed', fromMe: true }), false);
    assert.equal(observer.observe({ chatId: 'chat', senderId: 'sender', messageId: 'id-3', text: '', hasMedia: false }), false);
    assert.deepEqual(observer.events(), [{
      profileId: 'client-a', chatId: 'chat', senderId: 'sender', messageId: 'id-1', text: 'laporan', receivedAt: null,
    }]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('deduplicates a bridge reconnect replay by message id', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-observer-'));
  try {
    const observer = createTeamManagerObserver({ profileId: 'client-a', rootDir: root });
    const event = { chatId: 'chat', senderId: 'sender', messageId: 'id-1', text: 'laporan', fromMe: false };
    assert.equal(observer.observe(event), true);
    assert.equal(observer.observe(event), false);
    assert.equal(observer.events().length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
