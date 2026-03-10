/**
 * EventBus - Decoupled cross-module communication system
 * Allows modules to communicate without direct dependencies
 */

type EventCallback<T = any> = (data: T) => void;
type EventUnsubscribe = () => void;

interface EventSubscription {
  id: string;
  callback: EventCallback;
}

class EventBusClass {
  private events: Map<string, EventSubscription[]> = new Map();
  private idCounter = 0;

  /**
   * Subscribe to an event
   */
  on<T = any>(event: string, callback: EventCallback<T>): EventUnsubscribe {
    const id = `${++this.idCounter}`;
    const subscription: EventSubscription = { id, callback };

    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(subscription);

    return () => this.off(event, id);
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T = any>(event: string, data?: T): void {
    const subscribers = this.events.get(event);
    if (subscribers) {
      subscribers.forEach(sub => {
        try {
          sub.callback(data);
        } catch (error) {
          console.error(`EventBus: Error in handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Unsubscribe from an event
   */
  private off(event: string, id: string): void {
    const subscribers = this.events.get(event);
    if (subscribers) {
      const index = subscribers.findIndex(sub => sub.id === id);
      if (index !== -1) {
        subscribers.splice(index, 1);
      }
      if (subscribers.length === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * Clear all event subscriptions
   */
  clear(): void {
    this.events.clear();
  }
}

// Singleton instance
export const EventBus = new EventBusClass();

// Event type constants for type safety
export const EVENTS = {
  // Auth events
  AUTH_STATE_CHANGED: 'auth:stateChanged',
  AUTH_SIGN_OUT: 'auth:signOut',
  
  // Feed events
  FEED_REFRESH: 'feed:refresh',
  FEED_POST_CREATED: 'feed:postCreated',
  FEED_POST_DELETED: 'feed:postDeleted',
  FEED_POST_UPDATED: 'feed:postUpdated',
  
  // Reaction events
  REACTION_ADDED: 'reaction:added',
  REACTION_REMOVED: 'reaction:removed',
  REACTION_UPDATED: 'reaction:updated',
  
  // Comment events
  COMMENT_ADDED: 'comment:added',
  COMMENT_DELETED: 'comment:deleted',
  
  // Share events
  SHARE_COMPLETED: 'share:completed',
  
  // Story events
  STORY_CREATED: 'story:created',
  STORY_VIEWED: 'story:viewed',
  STORY_DELETED: 'story:deleted',
  
  // Group events
  GROUP_JOINED: 'group:joined',
  GROUP_LEFT: 'group:left',
  GROUP_POST_CREATED: 'group:postCreated',
  
  // Page events
  PAGE_FOLLOWED: 'page:followed',
  PAGE_UNFOLLOWED: 'page:unfollowed',
  PAGE_POST_CREATED: 'page:postCreated',
  
  // Notification events
  NOTIFICATION_RECEIVED: 'notification:received',
  NOTIFICATION_READ: 'notification:read',
  
  // Message events
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_SENT: 'message:sent',
  
  // Media events
  MEDIA_UPLOADED: 'media:uploaded',
  
  // Video events
  VIDEO_UPLOADED: 'video:uploaded',
  VIDEO_LIKED: 'video:liked',
  
  // Book events
  BOOK_UPLOADED: 'book:uploaded',
  BOOK_LIKED: 'book:liked',
  
  // Friend events
  FRIEND_REQUEST_SENT: 'friend:requestSent',
  FRIEND_REQUEST_ACCEPTED: 'friend:requestAccepted',
  FRIEND_REMOVED: 'friend:removed',
  
  // Navigation events
  NAVIGATE_TO: 'nav:to',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];
