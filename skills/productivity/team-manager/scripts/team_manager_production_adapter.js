import { TeamManagerEventStore } from './team_manager_contract.js';

export class TeamManagerProductionAdapter {
  constructor({ profileId, rootDir }) {
    this.profileId = profileId;
    this.store = new TeamManagerEventStore({ profileId, rootDir });
  }

  receiveBridgeEvent({ chatId, senderId, messageId, text, receivedAt = null }) {
    return this.store.append({
      profileId: this.profileId,
      chatId,
      senderId,
      messageId,
      text,
      receivedAt,
    });
  }

  events() { return this.store.read(); }
}
