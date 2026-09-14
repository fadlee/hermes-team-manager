import path from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';

export function normalizeWhatsAppIdentifier(value) {
  return String(value || '')
    .trim()
    .replace(/:.*@/, '@')
    .replace(/@.*/, '')
    .replace(/^\+/, '');
}

export function parseAllowedUsers(rawValue) {
  return new Set(
    String(rawValue || '')
      .split(',')
      .map((value) => normalizeWhatsAppIdentifier(value))
      .filter(Boolean)
  );
}

export function getCompanyAllowedUsers(rootDir = process.env.HERMES_HOME) {
  if (!rootDir || !existsSync(rootDir)) return new Set();
  const allowed = new Set();
  try {
    const membersDir = path.join(rootDir, 'company', 'members');
    if (existsSync(membersDir)) {
      const files = readdirSync(membersDir);
      for (const file of files) {
        if (!file.endsWith('.md') || file.startsWith('_')) continue;
        const content = readFileSync(path.join(membersDir, file), 'utf8');
        const match = content.match(/^whatsapp:\s*["']?([^"'\r\n]+)["']?/m);
        if (match && match[1]) {
          const num = normalizeWhatsAppIdentifier(match[1]);
          if (num && !num.startsWith('62811100000')) allowed.add(num);
        }
      }
    }
    const companyFile = path.join(rootDir, 'company', 'company.md');
    if (existsSync(companyFile)) {
      const content = readFileSync(companyFile, 'utf8');
      const match = content.match(/^owner_whatsapp:\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]) {
        const num = normalizeWhatsAppIdentifier(match[1]);
        if (num && !num.startsWith('62811100000')) allowed.add(num);
      }
    }
  } catch {}
  return allowed;
}

function readMappingFile(sessionDir, identifier, suffix = '') {
  const filePath = path.join(sessionDir, `lid-mapping-${identifier}${suffix}.json`);
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    const normalized = normalizeWhatsAppIdentifier(parsed);
    return normalized || null;
  } catch {
    return null;
  }
}

export function expandWhatsAppIdentifiers(identifier, sessionDir) {
  const normalized = normalizeWhatsAppIdentifier(identifier);
  if (!normalized) {
    return new Set();
  }

  // Walk both phone->LID and LID->phone mapping files so allowlists can use
  // either form transparently in bot mode.
  const resolved = new Set();
  const queue = [normalized];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || resolved.has(current)) {
      continue;
    }

    resolved.add(current);

    for (const suffix of ['', '_reverse']) {
      const mapped = readMappingFile(sessionDir, current, suffix);
      if (mapped && !resolved.has(mapped)) {
        queue.push(mapped);
      }
    }
  }

  return resolved;
}

export function matchesAllowedUser(senderId, allowedUsers, sessionDir, rootDir = process.env.HERMES_HOME) {
  const effectiveAllowed = new Set(allowedUsers || []);
  const companyAllowed = getCompanyAllowedUsers(rootDir);
  for (const num of companyAllowed) {
    effectiveAllowed.add(num);
  }

  // Empty allowlist = NO ONE allowed (secure default, #8389).
  if (!effectiveAllowed || effectiveAllowed.size === 0) {
    return false;
  }

  // "*" means allow everyone (consistent with SIGNAL_GROUP_ALLOWED_USERS)
  if (effectiveAllowed.has('*')) {
    return true;
  }

  const aliases = expandWhatsAppIdentifiers(senderId, sessionDir);
  for (const alias of aliases) {
    if (effectiveAllowed.has(alias)) {
      return true;
    }
  }

  return false;
}
