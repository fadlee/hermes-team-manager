function requiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required`);
  return value;
}

export class FakeWhatsAppAdapter {
  #inbound = [];
  #sent = [];

  async receive({ chatId, senderId, messageId, text = '' }) {
    const safeChatId = requiredString(chatId, 'chatId');
    if (!senderId || !messageId) throw new TypeError('senderId and messageId are required');
    this.#inbound.push({
      chatId: safeChatId,
      senderId: requiredString(senderId, 'senderId'),
      messageId: requiredString(messageId, 'messageId'),
      text: String(text),
    });
  }

  async send(chatId, text) {
    this.#sent.push({
      chatId: requiredString(chatId, 'chatId'),
      text: requiredString(text, 'text'),
    });
  }

  inbound() { return structuredClone(this.#inbound); }
  sent() { return structuredClone(this.#sent); }
}
