import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { buildOrder } from '../src/lib/orders/build-order.ts';
import { mapOrderRowToOrder } from '../src/lib/orders/order-mapper.ts';
import {
  AddressInputSchema,
  NotificationInputSchema,
  SignInSchema,
  SignUpSchema,
} from '../src/lib/account/schema.ts';

const typesContent = readFileSync('src/lib/supabase/database.types.ts', 'utf8');
const migrationSql = readFileSync('supabase/migrations/20261108000000_user_auth_orders.sql', 'utf8');
const headerContent = readFileSync('src/components/layout/SiteHeader.tsx', 'utf8');

describe('User Authentication, Account Schema & Orders Integration (Giai đoạn 1)', () => {
  it('enforces strict Supabase database types for user_addresses, user_notifications and orders.user_id', () => {
    // Must NOT have loose index signature
    assert.doesNotMatch(
      typesContent,
      /\[key:\s*string\]:\s*unknown/,
      'database.types.ts must maintain strict type invariant without loose index signatures',
    );

    // Must define orders with user_id
    assert.match(typesContent, /user_id:\s*string\s*\|\s*null;/);

    // Must define user_addresses and user_notifications tables
    assert.match(typesContent, /user_addresses:\s*\{/);
    assert.match(typesContent, /user_notifications:\s*\{/);
  });

  it('declares migration with comprehensive RLS policies and realtime broadcast', () => {
    // 1. Column user_id on orders
    assert.match(migrationSql, /alter table public\.orders\s+add column if not exists user_id/i);
    assert.match(migrationSql, /create index if not exists orders_user_id_idx/i);

    // 2. Updated RLS policy on orders
    assert.match(migrationSql, /create policy "Users read own orders"/i);
    assert.match(migrationSql, /auth\.uid\(\)\s*=\s*user_id\s+or\s+public\.is_store_admin\(\)/i);

    // 3. user_addresses table and RLS
    assert.match(migrationSql, /create table if not exists public\.user_addresses/i);
    assert.match(migrationSql, /alter table public\.user_addresses enable row level security/i);
    assert.match(migrationSql, /create policy "Users manage own addresses"/i);

    // 4. user_notifications table and RLS
    assert.match(migrationSql, /create table if not exists public\.user_notifications/i);
    assert.match(migrationSql, /alter table public\.user_notifications enable row level security/i);
    assert.match(migrationSql, /create policy "Users read own notifications"/i);

    // 5. Realtime publication
    assert.match(migrationSql, /alter publication supabase_realtime add table public\.user_notifications/i);
    assert.match(migrationSql, /alter table public\.user_notifications replica identity full/i);
  });

  it('validates authentication inputs using centralized Zod schemas', () => {
    // Valid sign in
    assert.equal(
      SignInSchema.safeParse({
        email: 'customer@3hvn.com',
        password: 'password123',
      }).success,
      true,
    );

    // Invalid email
    assert.equal(
      SignInSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      }).success,
      false,
    );

    // Short password in sign up
    assert.equal(
      SignUpSchema.safeParse({
        email: 'customer@3hvn.com',
        password: '123',
        fullName: 'Nguyễn Văn A',
      }).success,
      false,
    );

    // Valid sign up
    assert.equal(
      SignUpSchema.safeParse({
        email: 'customer@3hvn.com',
        password: 'password123',
        fullName: 'Nguyễn Văn A',
      }).success,
      true,
    );
  });

  it('validates user shipping address schema', () => {
    const validAddress = {
      recipientName: 'Trần Minh Đức',
      phone: '0901234567',
      streetAddress: '123 Phố Huế, Hàng Bài',
      city: 'Hà Nội',
      postalCode: '100000',
      isDefault: true,
    };

    assert.equal(AddressInputSchema.safeParse(validAddress).success, true);

    const invalidAddress = {
      ...validAddress,
      phone: 'abc', // Invalid phone
    };
    assert.equal(AddressInputSchema.safeParse(invalidAddress).success, false);
  });

  it('validates user notification schema', () => {
    const validNotif = {
      userId: 'c3a9b86c-137e-4b2a-9f02-067727bd47cd',
      title: 'Đơn hàng mới',
      message: 'Đơn hàng đã được xác nhận',
      type: 'order' as const,
    };

    assert.equal(NotificationInputSchema.safeParse(validNotif).success, true);
  });

  it('attaches userId in buildOrder and order-mapper', () => {
    const sampleCustomer = {
      fullName: 'Phạm Hoàng',
      email: 'hoang@example.com',
      phone: '0988776655',
      address: '456 Lê Lợi',
      city: 'Hồ Chí Minh',
    };

    const order = buildOrder({
      items: [],
      customer: sampleCustomer,
      paymentMethod: 'cod',
      userId: 'usr_mock_123',
    });

    assert.equal(order.userId, 'usr_mock_123');

    const mapped = mapOrderRowToOrder({
      id: 'ord_123',
      order_number: 'HGK-20261108',
      user_id: 'usr_mock_123',
      customer: sampleCustomer,
      items: [],
      fulfillments: [],
      total_amount: 500000,
    });

    assert.equal(mapped.userId, 'usr_mock_123');
  });

  it('integrates account navigation and user state hook in SiteHeader', () => {
    assert.match(headerContent, /getBrowserSupabaseClient/);
    assert.match(headerContent, /UserIcon/);
    assert.match(headerContent, /\/account/);
    assert.match(headerContent, /\/account\/login/);
  });
});
