import 'server-only';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import type { UserAddressRow, UserNotificationRow } from '@/lib/supabase/database.types';
import type { AddressInput, NotificationInput } from '@/lib/account/schema';

/**
 * List saved shipping addresses for a given user.
 */
export async function listUserAddresses(userId: string): Promise<UserAddressRow[]> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('user_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[listUserAddresses] Notice (table not yet created in Supabase):', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Save or create a new shipping address. If marked default, unsets default on other addresses.
 */
export async function saveUserAddress(
  input: AddressInput,
  userId: string,
  addressId?: string,
): Promise<UserAddressRow | null> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  if (input.isDefault) {
    await supabase
      .from('user_addresses')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  if (addressId) {
    const { data, error } = await supabase
      .from('user_addresses')
      .update({
        recipient_name: input.recipientName,
        phone: input.phone,
        street_address: input.streetAddress,
        city: input.city,
        postal_code: input.postalCode ?? null,
        is_default: input.isDefault,
        updated_at: new Date().toISOString(),
      })
      .eq('id', addressId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[saveUserAddress] Notice:', error.message);
      return null;
    }
    return data;
  }

  const { data, error } = await supabase
    .from('user_addresses')
    .insert({
      user_id: userId,
      recipient_name: input.recipientName,
      phone: input.phone,
      street_address: input.streetAddress,
      city: input.city,
      postal_code: input.postalCode ?? null,
      is_default: input.isDefault,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.warn('[saveUserAddress] Notice:', error.message);
    return null;
  }
  return data;
}

/**
 * Delete a user address.
 */
export async function deleteUserAddress(addressId: string, userId: string): Promise<boolean> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('user_addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', userId);

  return !error;
}

/**
 * List notifications for a given user.
 */
export async function listUserNotifications(
  userId: string,
  limit = 20,
): Promise<UserNotificationRow[]> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[listUserNotifications] Notice (table not yet created in Supabase):', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Mark a notification as read.
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  return !error;
}

/**
 * Create a new user notification (e.g. order placed, payment received).
 */
export async function createUserNotification(
  input: NotificationInput,
): Promise<UserNotificationRow | null> {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: input.userId,
      order_id: input.orderId ?? null,
      title: input.title,
      message: input.message,
      type: input.type,
      is_read: false,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.warn('[createUserNotification] Notice:', error.message);
    return null;
  }
  return data;
}
