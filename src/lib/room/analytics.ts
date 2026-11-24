/**
 * Room Setup Builder - Interaction Analytics & Event Tracking (Giai đoạn 5)
 * Dispatches structured custom events for client telemetry and custom handlers.
 */

export type RoomAnalyticsEventType =
  | 'room_view'
  | 'room_item_hover'
  | 'room_item_click'
  | 'room_combo_toggle'
  | 'room_combo_add_cart';

export interface RoomViewEvent {
  type: 'room_view';
  setupSlug: string;
  setupTitle: string;
  itemCount: number;
  productCount: number;
}

export interface RoomItemHoverEvent {
  type: 'room_item_hover';
  setupSlug: string;
  itemId: string;
  itemType: 'product' | 'decor';
  productId?: string | null;
  productName?: string | null;
}

export interface RoomItemClickEvent {
  type: 'room_item_click';
  setupSlug: string;
  itemId: string;
  itemType: 'product' | 'decor';
  productId?: string | null;
  productName?: string | null;
  price?: number;
}

export interface RoomComboToggleEvent {
  type: 'room_combo_toggle';
  setupSlug: string;
  itemId: string;
  selected: boolean;
  selectedCount: number;
}

export interface RoomComboAddCartEvent {
  type: 'room_combo_add_cart';
  setupSlug: string;
  productCount: number;
  originalTotal: number;
  discountAmount: number;
  finalTotal: number;
}

export type RoomAnalyticsEvent =
  | RoomViewEvent
  | RoomItemHoverEvent
  | RoomItemClickEvent
  | RoomComboToggleEvent
  | RoomComboAddCartEvent;

export type RoomAnalyticsHandler = (event: RoomAnalyticsEvent) => void;

/**
 * Dispatches a typed event to window.dispatchEvent and optional direct handler.
 */
export function trackRoomEvent(
  event: RoomAnalyticsEvent,
  customTracker?: RoomAnalyticsHandler
): void {
  if (customTracker) {
    try {
      customTracker(event);
    } catch {
      // Ignore tracker runtime errors
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const customEvent = new CustomEvent<RoomAnalyticsEvent>('room:analytics', {
        detail: event,
        bubbles: true,
      });
      window.dispatchEvent(customEvent);
    } catch {
      // Ignore if CustomEvent is not supported
    }
  }
}

/**
 * Subscribes to room setup analytics events in client components.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeRoomAnalytics(
  handler: RoomAnalyticsHandler
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const listener = (event: Event) => {
    const custom = event as CustomEvent<RoomAnalyticsEvent>;
    if (custom.detail) {
      handler(custom.detail);
    }
  };

  window.addEventListener('room:analytics', listener);
  return () => {
    window.removeEventListener('room:analytics', listener);
  };
}
