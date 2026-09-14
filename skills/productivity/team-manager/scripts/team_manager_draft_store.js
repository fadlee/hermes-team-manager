import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

function requiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required`);
  return value;
}

// Persists TeamManagerFlow's draft/approval state to disk so it survives
// across process boundaries (e.g. a cron process that builds the morning
// draft, and a later gateway process that handles the owner's WhatsApp
// reply). One file per profile, plain JSON, no database.
export class TeamManagerDraftStore {
  constructor({ profileId, rootDir }) {
    this.profileId = requiredString(profileId, 'profileId');
    this.filePath = path.join(requiredString(rootDir, 'rootDir'), this.profileId, 'team-manager-drafts.json');
  }

  load() {
    if (!existsSync(this.filePath)) return { drafts: [], awaitingConfirmation: false, unidentified: [] };
    return JSON.parse(readFileSync(this.filePath, 'utf8'));
  }

  save(state) {
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(state), { encoding: 'utf8', mode: 0o600 });
  }
}
