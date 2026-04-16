type MessageHandler = (topic: string, payload: any) => void;

class MessageBus {
  private subscribers: Map<string, Set<MessageHandler>>;

  constructor() {
    this.subscribers = new Map();
  }

  /**
   * Subscribes a handler to a specific topic or all topics.
   * @param topic The topic to subscribe to. Use '*' for all topics.
   * @param handler The function to call when a message is published.
   * @returns An unsubscribe function.
   */
  public subscribe(topic: string, handler: MessageHandler): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    const topicSubscribers = this.subscribers.get(topic)!;
    topicSubscribers.add(handler);

    return () => {
      topicSubscribers.delete(handler);
    };
  }

  /**
   * Publishes a message to a specific topic.
   * @param topic The topic to publish to.
   * @param payload The data to send with the message.
   */
  public publish(topic: string, payload: any): void {
    // Notify specific topic subscribers
    const topicSubscribers = this.subscribers.get(topic);
    if (topicSubscribers) {
      topicSubscribers.forEach(handler => {
        try {
          handler(topic, payload);
        } catch (e) {
          console.error(`[MessageBus] Error in handler for topic "${topic}":`, e);
        }
      });
    }

    // Notify wildcard ('*') subscribers
    const wildcardSubscribers = this.subscribers.get('*');
    if (wildcardSubscribers) {
      wildcardSubscribers.forEach(handler => {
        try {
          handler(topic, payload);
        } catch (e) {
          console.error(`[MessageBus] Error in wildcard handler for topic "${topic}":`, e);
        }
      });
    }
  }
}

// Export a singleton instance
export const messageBus = new MessageBus();
