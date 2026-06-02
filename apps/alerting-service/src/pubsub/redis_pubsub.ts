import { PubSub, PubSubEngine } from 'graphql-subscriptions';
import Redis from 'ioredis';
import { config } from '../config';

class RedisPubSub extends PubSubEngine {
  private pubClient?: Redis;
  private subClient?: Redis;
  private localPubSub: PubSub;
  private listeners: Map<string, Array<(payload: any) => void>> = new Map();

  constructor() {
    super();
    this.localPubSub = new PubSub();

    if (config.NODE_ENV !== 'test') {
      try {
        this.pubClient = new Redis(config.REDIS_URL, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });
        this.subClient = new Redis(config.REDIS_URL, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });

        this.subClient.on('message', (channel, message) => {
          try {
            const parsed = JSON.parse(message);
            const channelListeners = this.listeners.get(channel);
            if (channelListeners) {
              channelListeners.forEach((listener) => listener(parsed));
            }
            // Also notify local PubSub
            this.localPubSub.publish(channel, parsed).catch(() => {});
          } catch (err) {
            console.error(`❌ Redis PubSub message parse failure on channel ${channel}:`, err);
          }
        });

        this.pubClient.on('error', (err) => {
          console.error('❌ Redis PubSub Client Error:', err);
        });
        this.subClient.on('error', (err) => {
          console.error('❌ Redis PubSub Subscriber Error:', err);
        });
      } catch (err) {
        console.error('⚠️ Failed to initialize Redis PubSub connection. Falling back to memory:', err);
      }
    }
  }

  async publish(triggerName: string, payload: any): Promise<void> {
    if (this.pubClient) {
      try {
        await this.pubClient.publish(triggerName, JSON.stringify(payload));
      } catch (err) {
        console.error(`❌ Failed to publish to Redis PubSub channel ${triggerName}:`, err);
        await this.localPubSub.publish(triggerName, payload);
      }
    } else {
      await this.localPubSub.publish(triggerName, payload);
    }
  }

  async subscribe(triggerName: string, onMessage: (payload: any) => void, options: any = {}): Promise<number> {
    if (this.subClient) {
      try {
        let channelListeners = this.listeners.get(triggerName);
        if (!channelListeners) {
          channelListeners = [];
          this.listeners.set(triggerName, channelListeners);
          await this.subClient.subscribe(triggerName);
        }
        channelListeners.push(onMessage);
      } catch (err) {
        console.error(`❌ Failed to subscribe to Redis PubSub channel ${triggerName}:`, err);
      }
    }
    return (this.localPubSub as any).subscribe(triggerName, onMessage);
  }

  async unsubscribe(subId: number): Promise<void> {
    await this.localPubSub.unsubscribe(subId);
  }

  asyncIterator<T>(triggers: string | string[]): AsyncIterator<T> {
    return (this.localPubSub as any).asyncIterator(triggers);
  }

  async close(): Promise<void> {
    if (this.pubClient) await this.pubClient.quit();
    if (this.subClient) await this.subClient.quit();
  }
}

export const pubsub = new RedisPubSub();
export default pubsub;
