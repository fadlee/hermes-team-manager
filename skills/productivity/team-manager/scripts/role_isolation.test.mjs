// Regression guard for the "Budi got treated as owner" bug: a team member
// must never be classified as owner, so bridge.js's slash-command block and
// [LAPORAN KARYAWAN] tagging always apply to them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { isOwnerSender, getSenderMemberInfo } from './allowlist.js';

function makeCompany(root, { owner, memberWhatsapp }) {
  mkdirSync(path.join(root, 'company', 'members'), { recursive: true });
  writeFileSync(
    path.join(root, 'company', 'company.md'),
    `---\nowner_whatsapp: "${owner}"\n---\n# Company`
  );
  writeFileSync(
    path.join(root, 'company', 'members', 'budi.md'),
    `---\nid: "budi"\nname: "Budi Santoso"\nrole: "Kasir"\nwhatsapp: "${memberWhatsapp}"\nstatus: active\n---\n# Budi`
  );
}

test('team member (Budi) is never classified as owner', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-role-'));
  const sessionDir = mkdtempSync(path.join(os.tmpdir(), 'hermes-role-session-'));
  try {
    makeCompany(root, { owner: '6281227785005', memberWhatsapp: '6285876047320' });

    assert.equal(isOwnerSender('6285876047320@s.whatsapp.net', sessionDir, root), false);
    assert.equal(isOwnerSender('6281227785005@s.whatsapp.net', sessionDir, root), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(sessionDir, { recursive: true, force: true });
  }
});

test('getSenderMemberInfo tags the correct member identity for a team sender', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-role-'));
  const sessionDir = mkdtempSync(path.join(os.tmpdir(), 'hermes-role-session-'));
  try {
    makeCompany(root, { owner: '6281227785005', memberWhatsapp: '6285876047320' });

    const info = getSenderMemberInfo('6285876047320@s.whatsapp.net', sessionDir, root);
    assert.equal(info?.id, 'budi');
    assert.equal(info?.role, 'Kasir');

    // Owner sending has no member record (they're not a team member).
    assert.equal(getSenderMemberInfo('6281227785005@s.whatsapp.net', sessionDir, root), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(sessionDir, { recursive: true, force: true });
  }
});

test('unknown sender (neither owner nor registered member) is not owner and has no member tag', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-role-'));
  const sessionDir = mkdtempSync(path.join(os.tmpdir(), 'hermes-role-session-'));
  try {
    makeCompany(root, { owner: '6281227785005', memberWhatsapp: '6285876047320' });

    assert.equal(isOwnerSender('628999999999@s.whatsapp.net', sessionDir, root), false);
    assert.equal(getSenderMemberInfo('628999999999@s.whatsapp.net', sessionDir, root), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(sessionDir, { recursive: true, force: true });
  }
});

test('no owner_whatsapp configured means nobody is classified as owner (fail closed)', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hermes-role-'));
  const sessionDir = mkdtempSync(path.join(os.tmpdir(), 'hermes-role-session-'));
  try {
    mkdirSync(path.join(root, 'company'), { recursive: true });
    writeFileSync(path.join(root, 'company', 'company.md'), '# Company\n(no owner_whatsapp set)');

    assert.equal(isOwnerSender('6281227785005@s.whatsapp.net', sessionDir, root), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(sessionDir, { recursive: true, force: true });
  }
});
