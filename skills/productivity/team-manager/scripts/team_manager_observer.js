import { TeamManagerEventStore } from './team_manager_contract.js';

export function createTeamManagerObserver({ profileId, rootDir } = {}) {
  if (!profileId) return { enabled: false, observe: () => null, events: () => [] };

  const store = new TeamManagerEventStore({ profileId, rootDir });
  const seenIds = new Set(store.read().map((event) => event.messageId));

  return {
    enabled: true,
    observe({ chatId, senderId, messageId, text = '', hasMedia = false, fromMe = false, receivedAt = null }) {
      if (fromMe || (!text && !hasMedia) || seenIds.has(messageId)) return false;
      store.append({ profileId, chatId, senderId, messageId, text, receivedAt });
      seenIds.add(messageId);
      return true;
    },
    events() { return store.read(); },
  };
}
