function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

// First word only, punctuation stripped: lets "gas, sudah bener" or "oke siap"
// match on intent without requiring the WHOLE message to be one exact word.
// Still fully deterministic/rule-based (no LLM guessing) so behavior stays testable.
function firstWord(text) {
  return normalize(text).replace(/[.,!?;:]/g, '').split(/\s+/)[0] || '';
}

const APPROVAL_WORDS = ['oke', 'ok', 'okay', 'setuju', 'approve', 'gas', 'sip', 'lanjut', 'boleh'];
const CONFIRMATION_WORDS = ['ya', 'iya', 'yes', 'oke', 'ok', 'okay', 'benar', 'betul', 'lanjut', 'gas'];
// A message starting with an approval word but also naming a revision
// ("gas tapi budi skip poin 1") must go through the revision path, not
// wholesale-approve everything.
const REVISION_MARKER_RE = /\bskip\b|\bhapus\b|\bbatal\b|\bkecuali\b/;

function isApproval(text) {
  return APPROVAL_WORDS.includes(firstWord(text)) && !REVISION_MARKER_RE.test(normalize(text));
}

function isConfirmation(text) {
  return CONFIRMATION_WORDS.includes(firstWord(text));
}

export class TeamManagerFlow {
  #drafts = [];
  #awaitingConfirmation = false;
  #unidentified = [];
  #store = null;

  constructor({ ownerId, adapter, employees = {}, store = null }) {
    if (!ownerId || !adapter) throw new TypeError('ownerId and adapter are required');
    this.ownerId = ownerId;
    this.adapter = adapter;
    this.employees = employees;
    this.#store = store;
    if (store) {
      const saved = store.load();
      this.#drafts = saved.drafts ?? [];
      this.#awaitingConfirmation = saved.awaitingConfirmation ?? false;
      this.#unidentified = saved.unidentified ?? [];
    }
  }

  #persist() {
    this.#store?.save({
      drafts: this.#drafts,
      awaitingConfirmation: this.#awaitingConfirmation,
      unidentified: this.#unidentified,
    });
  }

  async queueDraft(employeeId, instructions) {
    if (!employeeId || !Array.isArray(instructions) || !instructions.length) {
      throw new TypeError('employeeId and at least one instruction are required');
    }
    this.#drafts.push({ employeeId, instructions: [...instructions] });
    this.#persist();
  }

  pendingDrafts() { return this.#drafts.length; }
  unidentifiedSenders() { return structuredClone(this.#unidentified); }

  async handleOwnerMessage(text) {
    if (this.#awaitingConfirmation) {
      if (isConfirmation(text)) await this.#sendDrafts();
      return;
    }
    if (isApproval(text)) await this.#sendDrafts();
    else await this.#applyPartialRevision(text);
  }

  async #applyPartialRevision(text) {
    const norm = normalize(text).replace(/[.,!?;]/g, '');
    // Supports "<budi> skip/hapus poin <N> ..." and "... skip/hapus poin <N> ... punya <budi>"
    // in either order — still one deterministic rule, not free-form LLM guessing.
    // Try backward first (has an explicit punya/milik/untuk marker, so it's unambiguous);
    // forward only accepts a name that matches an existing draft (rejects filler words
    // like "tolong hapus poin 1" being misread as employee "tolong").
    const backward = norm.match(/\b(?:skip|hapus|batal(?:kan)?)\s+poin\s+(\d+)\b.*?\b(?:punya|milik|untuk)\s+(\S+)/);
    let employeeId, point;
    if (backward) {
      [point, employeeId] = [backward[1], backward[2]];
    } else {
      const forward = norm.match(/^(?:\S+\s+)*?(\S+)\s+(?:skip|hapus|batal(?:kan)?)\s+poin\s+(\d+)\b/);
      if (forward && this.#drafts.some((d) => d.employeeId === forward[1])) {
        [employeeId, point] = [forward[1], forward[2]];
      }
    }
    if (!employeeId || !point) return;
    const draft = this.#drafts.find((item) => item.employeeId === employeeId);
    const index = Number(point) - 1;
    if (!draft || index < 0 || index >= draft.instructions.length) return;

    draft.instructions.splice(index, 1);
    this.#awaitingConfirmation = true;
    this.#persist();
    await this.adapter.send(
      this.ownerId,
      `Konfirmasi: ${employeeId[0].toUpperCase()}${employeeId.slice(1)} poin ${point} dihapus; kirim ${draft.instructions.length} instruksi sekarang?`,
    );
  }

  async #sendDrafts() {
    for (const draft of this.#drafts) {
      for (const instruction of draft.instructions) await this.adapter.send(draft.employeeId, instruction);
    }
    this.#drafts = [];
    this.#awaitingConfirmation = false;
    this.#persist();
  }

  async handleEmployeeMessage({ senderId, text }) {
    const employeeId = this.employees[senderId];
    if (!employeeId) {
      this.#unidentified.push({ senderId, text });
      this.#persist();
      return;
    }
    if (/\burgent\b/i.test(String(text))) {
      await this.adapter.send(this.ownerId, `URGENT dari ${employeeId}: ${text}`);
    }
  }
}
