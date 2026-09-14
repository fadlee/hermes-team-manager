import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

import { TeamManagerProductionAdapter } from './team_manager_production_adapter.js';

test('normalizes and stores a production bridge event in its profile-local workspace', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-team-manager-'));
  try {
    const adapter = new TeamManagerProductionAdapter({ profileId: 'client-a', rootDir: root });
    const event = adapter.receiveBridgeEvent({
      chatId: '628111111111@s.whatsapp.net',
      senderId: '628111111111@s.whatsapp.net',
      messageId: 'msg-001',
      text: 'Laporan selesai',
    });

    assert.equal(event.profileId, 'client-a');
    assert.deepEqual(adapter.events(), [event]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('does not provide a WhatsApp send operation', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-team-manager-'));
  try {
    const adapter = new TeamManagerProductionAdapter({ profileId: 'client-a', rootDir: root });
    assert.equal('send' in adapter, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
