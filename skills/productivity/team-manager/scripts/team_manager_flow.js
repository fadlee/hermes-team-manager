function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

function isApproval(text) {
  return ['oke', 'setuju', 'approve', 'gas'].includes(normalize(text));
}

function isConfirmation(text) {
  return ['ya', 'iya'].includes(normalize(text));
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
    const match = normalize(text).match(/^(\S+)\s+skip poin\s+(\d+),\s*sisanya oke$/);
    if (!match) return;
    const [, employeeId, point] = match;
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
