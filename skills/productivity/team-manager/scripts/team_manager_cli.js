#!/usr/bin/env node
// CLI resmi yang menyambungkan TeamManagerFlow (draft/approval/kirim) dengan
// dunia luar: cron job (menyusun draft pagi) dan bridge WhatsApp (nanti,
// balasan owner/anggota tim). Satu titik masuk teruji, bukan skrip sekali-pakai.
//
// State disimpan di $HERMES_HOME milik profil yang menjalankannya, jadi tiap
// klien (tiap install/profile) otomatis terisolasi tanpa konfigurasi tambahan.
import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { TeamManagerFlow } from './team_manager_flow.js';
import { TeamManagerDraftStore } from './team_manager_draft_store.js';
import { TeamManagerEventStore } from './team_manager_contract.js';
import { FakeWhatsAppAdapter } from './fake_whatsapp_adapter.js';

const HERMES_HOME = process.env.HERMES_HOME || process.cwd();
const PROFILE_ID = String(process.env.WHATSAPP_TEAM_MANAGER_PROFILE_ID || 'default').trim();
const OWNER_ID = String(process.env.TEAM_MANAGER_OWNER_ID || 'owner').trim();

function parseArgs(argv) {
  const args = { instructions: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--employee') args.employee = argv[++i];
    else if (token === '--instruction') args.instructions.push(argv[++i]);
    else if (token === '--text') args.text = argv[++i];
    else if (token === '--employees') args.employees = JSON.parse(argv[++i]);
  }
  return args;
}

function cursorPath(rootDir, profileId) {
  return path.join(rootDir, profileId, 'team-manager-inbound-cursor.json');
}

function readCursor(rootDir, profileId) {
  const file = cursorPath(rootDir, profileId);
  if (!existsSync(file)) return { processedCount: 0 };
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeCursor(rootDir, profileId, cursor) {
  const file = cursorPath(rootDir, profileId);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(cursor), { encoding: 'utf8', mode: 0o600 });
}

export async function run(argv, { rootDir = HERMES_HOME, profileId = PROFILE_ID, ownerId = OWNER_ID } = {}) {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  const store = new TeamManagerDraftStore({ profileId, rootDir });
  const adapter = new FakeWhatsAppAdapter(); // outbound nyata: ganti adapter ini saat kirim WA aktif
  const flow = new TeamManagerFlow({ ownerId, adapter, employees: args.employees || {}, store });

  switch (command) {
    case 'queue-draft': {
      if (!args.employee || !args.instructions.length) {
        throw new Error('queue-draft butuh --employee dan minimal satu --instruction');
      }
      await flow.queueDraft(args.employee, args.instructions);
      return { command, employee: args.employee, pendingDrafts: flow.pendingDrafts() };
    }
    case 'handle-owner': {
      if (!args.text) throw new Error('handle-owner butuh --text');
      await flow.handleOwnerMessage(args.text);
      return { command, sent: adapter.sent(), pendingDrafts: flow.pendingDrafts() };
    }
    case 'process-inbound': {
      const eventStore = new TeamManagerEventStore({ profileId, rootDir });
      const events = eventStore.read();
      const cursor = readCursor(rootDir, profileId);
      const pending = events.slice(cursor.processedCount);
      for (const event of pending) {
        await flow.handleEmployeeMessage({ senderId: event.senderId, text: event.text });
      }
      writeCursor(rootDir, profileId, { processedCount: events.length });
      return {
        command,
        processed: pending.length,
        sent: adapter.sent(),
        unidentifiedSenders: flow.unidentifiedSenders(),
      };
    }
    case 'status': {
      return { command, pendingDrafts: flow.pendingDrafts(), unidentifiedSenders: flow.unidentifiedSenders() };
    }
    default:
      throw new Error(`Perintah tidak dikenal: "${command}". Pakai: queue-draft | handle-owner | process-inbound | status`);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  run(process.argv.slice(2))
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(JSON.stringify({ error: error.message }));
      process.exit(1);
    });
}
