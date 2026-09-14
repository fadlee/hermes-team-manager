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

export function getCompanyOwnerNumber(rootDir = process.env.HERMES_HOME) {
  if (!rootDir || !existsSync(rootDir)) return null;
  try {
    const companyFile = path.join(rootDir, 'company', 'company.md');
    if (existsSync(companyFile)) {
      const content = readFileSync(companyFile, 'utf8');
      const match = content.match(/^owner_whatsapp:\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]) {
        return normalizeWhatsAppIdentifier(match[1]);
      }
    }
  } catch {}
  return null;
}

export function getCompanyMembers(rootDir = process.env.HERMES_HOME) {
  if (!rootDir || !existsSync(rootDir)) return {};
  const members = {};
  try {
    const membersDir = path.join(rootDir, 'company', 'members');
    if (existsSync(membersDir)) {
      const files = readdirSync(membersDir);
      for (const file of files) {
        if (!file.endsWith('.md') || file.startsWith('_')) continue;
        const content = readFileSync(path.join(membersDir, file), 'utf8');
        const idMatch = content.match(/^id:\s*["']?([^"'\r\n]+)["']?/m) || [null, path.basename(file, '.md')];
        const nameMatch = content.match(/^name:\s*["']?([^"'\r\n]+)["']?/m);
        const roleMatch = content.match(/^role:\s*["']?([^"'\r\n]+)["']?/m);
        const waMatch = content.match(/^whatsapp:\s*["']?([^"'\r\n]+)["']?/m);
        if (waMatch && waMatch[1]) {
          const num = normalizeWhatsAppIdentifier(waMatch[1]);
          if (num && !num.startsWith('62811100000')) {
            members[num] = {
              id: idMatch[1] || path.basename(file, '.md'),
              name: nameMatch ? nameMatch[1] : idMatch[1],
              role: roleMatch ? roleMatch[1] : 'Anggota Tim',
            };
          }
        }
      }
    }
  } catch {}
  return members;
}

export function getCompanyAllowedUsers(rootDir = process.env.HERMES_HOME) {
  if (!rootDir || !existsSync(rootDir)) return new Set();
  const allowed = new Set();
  const ownerNum = getCompanyOwnerNumber(rootDir);
  if (ownerNum && !ownerNum.startsWith('62811100000')) {
    allowed.add(ownerNum);
  }
  const members = getCompanyMembers(rootDir);
  for (const num of Object.keys(members)) {
    allowed.add(num);
  }
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

export function isOwnerSender(senderId, sessionDir, rootDir = process.env.HERMES_HOME) {
  const ownerNum = getCompanyOwnerNumber(rootDir);
  if (!ownerNum) return false;
  const aliases = expandWhatsAppIdentifiers(senderId, sessionDir);
  return aliases.has(ownerNum);
}

export function getSenderMemberInfo(senderId, sessionDir, rootDir = process.env.HERMES_HOME) {
  const members = getCompanyMembers(rootDir);
  const aliases = expandWhatsAppIdentifiers(senderId, sessionDir);
  for (const alias of aliases) {
    if (members[alias]) return members[alias];
  }
  return null;
}

export function matchesAllowedUser(senderId, allowedUsers, sessionDir, rootDir = process.env.HERMES_HOME) {
  const effectiveAllowed = new Set(allowedUsers || []);
  const companyAllowed = getCompanyAllowedUsers(rootDir);
  for (const num of companyAllowed) {
    effectiveAllowed.add(num);
  }

  if (!effectiveAllowed || effectiveAllowed.size === 0) {
    return false;
  }

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
