'use client';

import { useEffect, useState, useCallback } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { mapOrderRowToOrder } from '@/lib/orders/order-mapper';
import type { Order } from '@/types/order';

export { mapOrderRowToOrder };
export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'mock';

function getInitialRealtimeStatus(): RealtimeStatus {
  if (typeof window === 'undefined') return 'mock';
  return getBrowserSupabaseClient() ? 'connecting' : 'mock';
}

/**
 * Hook for Admin Orders dashboard: subscribes to live INSERT, UPDATE, DELETE events
 * on the Supabase orders table.
 */
export function useRealtimeOrders(initialOrders: Order[]) {
  const [prevInitial, setPrevInitial] = useState(initialOrders);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(getInitialRealtimeStatus);
  const [latestNewOrder, setLatestNewOrder] = useState<Order | null>(null);

  if (initialOrders !== prevInitial) {
    setPrevInitial(initialOrders);
    setOrders(initialOrders);
  }

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel('admin-orders-realtime-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = mapOrderRowToOrder(payload.new as Record<string, unknown>);
            setOrders((prev) => {
              if (prev.some((o) => o.id === newOrder.id)) return prev;
              return [newOrder, ...prev];
            });
            setLatestNewOrder(newOrder);
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapOrderRowToOrder(payload.new as Record<string, unknown>);
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)),
            );
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) {
              setOrders((prev) => prev.filter((o) => o.id !== oldId));
            }
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const clearAlert = useCallback(() => setLatestNewOrder(null), []);

  return {
    orders,
    realtimeStatus,
    latestNewOrder,
    clearAlert,
  };
}

/**
 * Hook for Single Order Tracking page: subscribes to status changes for a specific order.
 */
export function useRealtimeOrderStatus(initialOrder: Order) {
  const [prevInitial, setPrevInitial] = useState(initialOrder);
  const [order, setOrder] = useState<Order>(initialOrder);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(getInitialRealtimeStatus);
  const [justPaid, setJustPaid] = useState(false);

  if (initialOrder !== prevInitial) {
    setPrevInitial(initialOrder);
    setOrder(initialOrder);
  }

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`order-tracking-${initialOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${initialOrder.id}`,
        },
        (payload) => {
          const updated = mapOrderRowToOrder(payload.new as Record<string, unknown>);
          setOrder((prev) => {
            if (prev.paymentStatus !== 'paid' && updated.paymentStatus === 'paid') {
              setJustPaid(true);
            }
            return { ...prev, ...updated };
          });
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialOrder.id]);

  return { order, realtimeStatus, justPaid };
}
