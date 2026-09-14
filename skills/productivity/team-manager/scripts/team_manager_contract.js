import path from 'node:path';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';

function requiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required`);
  return value;
}

export function normalizeTeamManagerEvent(event) {
  const normalized = {
    profileId: requiredString(event?.profileId, 'profileId'),
    chatId: requiredString(event?.chatId, 'chatId'),
    senderId: event?.senderId,
    messageId: event?.messageId,
    text: String(event?.text ?? ''),
    receivedAt: event?.receivedAt ?? null,
  };
  if (!normalized.senderId || !normalized.messageId) {
    throw new TypeError('senderId and messageId are required');
  }
  normalized.senderId = requiredString(normalized.senderId, 'senderId');
  normalized.messageId = requiredString(normalized.messageId, 'messageId');
  return normalized;
}

export class TeamManagerEventStore {
  constructor({ profileId, rootDir }) {
    this.profileId = requiredString(profileId, 'profileId');
    this.filePath = path.join(requiredString(rootDir, 'rootDir'), this.profileId, 'team-manager-events.jsonl');
  }

  append(event) {
    const normalized = normalizeTeamManagerEvent(event);
    if (normalized.profileId !== this.profileId) throw new Error('profile mismatch');
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, `${JSON.stringify(normalized)}\n`, { encoding: 'utf8', mode: 0o600 });
    return normalized;
  }

  read() {
    if (!existsSync(this.filePath)) return [];
    return readFileSync(this.filePath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  }
}
