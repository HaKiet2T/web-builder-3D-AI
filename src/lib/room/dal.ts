import 'server-only';
import { requireAdminSupabaseClient } from '@/lib/admin/auth';
import { listProducts } from '@/lib/catalog/dal';
import { PRODUCT_RECORDS } from '@/lib/catalog/sample-data';
import { PRESET_DECOR_ASSETS, SAMPLE_ROOM_ITEMS, SAMPLE_ROOM_SETUPS } from '@/lib/room/sample-data';
import {
  RoomItemSchema,
  RoomSetupInputSchema,
  type RoomItemInput,
  type RoomSetupInput,
} from '@/lib/room/schema';
import type {
  DecorAsset,
  RoomItem,
  RoomSetup,
  RoomSetupWithItems,
} from '@/lib/room/types';
import type { RoomItemRow, RoomSetupRow } from '@/lib/supabase/database.types';
import { createPublicSupabaseClient } from '@/lib/supabase/public';

function mapRoomSetupRow(row: RoomSetupRow): RoomSetup {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    bgImageUrl: row.bg_image_url,
    aspectRatio: Number(row.aspect_ratio),
    status: row.status,
    comboDiscountPct: Number(row.combo_discount_pct),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRoomItemRow(row: RoomItemRow): RoomItem {
  return {
    id: row.id,
    setupId: row.setup_id,
    itemType: row.item_type,
    productId: row.product_id,
    variantId: row.variant_id,
    customImageUrl: row.custom_image_url,
    label: row.label,
    xPct: Number(row.x_pct),
    yPct: Number(row.y_pct),
    widthPct: Number(row.width_pct),
    rotation: Number(row.rotation),
    flipX: Boolean(row.flip_x),
    zIndex: Number(row.z_index),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

import { calculateComboPricing, hydrateRoomItems } from '@/lib/room/pricing';

export { calculateComboPricing, hydrateRoomItems };

export function getSampleRoomSetups(): RoomSetup[] {
  return SAMPLE_ROOM_SETUPS;
}

export function getSampleRoomSetupBySlug(slug: string): RoomSetupWithItems | null {
  const setup = SAMPLE_ROOM_SETUPS.find((s) => s.slug === slug);
  if (!setup) return null;

  const rawItems = SAMPLE_ROOM_ITEMS.filter((item) => item.setupId === setup.id);
  const hydratedItems = hydrateRoomItems(rawItems, PRODUCT_RECORDS);
  const comboPricing = calculateComboPricing(hydratedItems, setup.comboDiscountPct);

  return {
    ...setup,
    items: hydratedItems,
    comboPricing,
  };
}

export async function listPublishedRoomSetups(): Promise<RoomSetup[]> {
  const fallback = SAMPLE_ROOM_SETUPS.filter((s) => s.status === 'published');
  const supabase = createPublicSupabaseClient();
  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from('room_setups')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[listPublishedRoomSetups] Notice (falling back to sample):', error.message);
      return fallback;
    }

    if (!data || data.length === 0) {
      return fallback;
    }

    return (data as RoomSetupRow[]).map(mapRoomSetupRow);
  } catch (error) {
    console.warn('[listPublishedRoomSetups] Notice (falling back to sample):', error);
    return fallback;
  }
}

export async function getRoomSetupBySlug(
  slug: string,
): Promise<RoomSetupWithItems | null> {
  const fallback = getSampleRoomSetupBySlug(slug);
  const supabase = createPublicSupabaseClient();
  if (!supabase) return fallback;

  try {
    const { data: setupRow, error: setupError } = await supabase
      .from('room_setups')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (setupError) {
      console.warn('[getRoomSetupBySlug] Notice (falling back to sample):', setupError.message);
      return fallback;
    }

    if (!setupRow) {
      return fallback;
    }

    const setup = mapRoomSetupRow(setupRow as RoomSetupRow);

    const { data: itemRows, error: itemsError } = await supabase
      .from('room_items')
      .select('*')
      .eq('setup_id', setup.id)
      .order('z_index', { ascending: true });

    if (itemsError) {
      console.warn('[getRoomSetupBySlug] Notice loading items:', itemsError.message);
    }

    const rawItems = ((itemRows as RoomItemRow[]) || []).map(mapRoomItemRow);
    const products = await listProducts();
    const hydratedItems = hydrateRoomItems(rawItems, products);
    const comboPricing = calculateComboPricing(hydratedItems, setup.comboDiscountPct);

    return {
      ...setup,
      items: hydratedItems,
      comboPricing,
    };
  } catch (error) {
    console.warn('[getRoomSetupBySlug] Notice (falling back to sample):', error);
    return fallback;
  }
}

export async function getRoomSetupById(
  id: string,
): Promise<RoomSetupWithItems | null> {
  const sample = SAMPLE_ROOM_SETUPS.find((s) => s.id === id);
  const fallback = sample ? getSampleRoomSetupBySlug(sample.slug) : null;
  const supabase = createPublicSupabaseClient();
  if (!supabase) return fallback;

  try {
    const { data: setupRow, error: setupError } = await supabase
      .from('room_setups')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (setupError || !setupRow) {
      return fallback;
    }

    const setup = mapRoomSetupRow(setupRow as RoomSetupRow);

    const { data: itemRows } = await supabase
      .from('room_items')
      .select('*')
      .eq('setup_id', setup.id)
      .order('z_index', { ascending: true });

    const rawItems = ((itemRows as RoomItemRow[]) || []).map(mapRoomItemRow);
    const products = await listProducts();
    const hydratedItems = hydrateRoomItems(rawItems, products);
    const comboPricing = calculateComboPricing(hydratedItems, setup.comboDiscountPct);

    return {
      ...setup,
      items: hydratedItems,
      comboPricing,
    };
  } catch {
    return fallback;
  }
}

export async function listAdminRoomSetups(): Promise<RoomSetup[]> {
  const fallback = SAMPLE_ROOM_SETUPS;
  const supabase = await requireAdminSupabaseClient();
  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from('room_setups')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[listAdminRoomSetups] Notice (falling back to sample):', error.message);
      return fallback;
    }

    if (!data || data.length === 0) {
      return fallback;
    }

    return (data as RoomSetupRow[]).map(mapRoomSetupRow);
  } catch {
    return fallback;
  }
}

export async function upsertRoomSetup(input: RoomSetupInput): Promise<RoomSetup> {
  const validated = RoomSetupInputSchema.parse(input);
  const supabase = await requireAdminSupabaseClient();

  if (!supabase) {
    const existing = SAMPLE_ROOM_SETUPS.find(
      (s) => (validated.id && s.id === validated.id) || s.slug === validated.slug,
    );
    const now = new Date().toISOString();
    return {
      id: validated.id || existing?.id || 'sample-setup-id',
      slug: validated.slug,
      title: validated.title,
      description: validated.description || '',
      bgImageUrl: validated.bgImageUrl,
      aspectRatio: validated.aspectRatio ?? 1.6,
      status: validated.status ?? 'draft',
      comboDiscountPct: validated.comboDiscountPct ?? 0,
      sortOrder: validated.sortOrder ?? 0,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
  }

  const payload = {
    ...(validated.id ? { id: validated.id } : {}),
    slug: validated.slug,
    title: validated.title,
    description: validated.description ?? '',
    bg_image_url: validated.bgImageUrl,
    aspect_ratio: validated.aspectRatio ?? 1.6,
    status: validated.status ?? 'draft',
    combo_discount_pct: validated.comboDiscountPct ?? 0,
    sort_order: validated.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('room_setups')
    .upsert(payload, { onConflict: 'slug' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to upsert room setup: ${error?.message || 'Unknown error'}`);
  }

  return mapRoomSetupRow(data as RoomSetupRow);
}

export async function saveRoomItems(
  setupId: string,
  items: RoomItemInput[],
): Promise<RoomItem[]> {
  const validatedItems = items.map((item) => RoomItemSchema.parse(item));
  const supabase = await requireAdminSupabaseClient();

  if (!supabase) {
    return validatedItems.map((item, idx) => ({
      id: item.id || `sample-item-${idx}`,
      setupId,
      itemType: item.itemType,
      productId: item.productId ?? null,
      variantId: item.variantId ?? null,
      customImageUrl: item.customImageUrl ?? null,
      label: item.label ?? null,
      xPct: item.xPct,
      yPct: item.yPct,
      widthPct: item.widthPct,
      rotation: item.rotation ?? 0,
      flipX: item.flipX ?? false,
      zIndex: item.zIndex ?? 1,
    }));
  }

  const { error: deleteError } = await supabase
    .from('room_items')
    .delete()
    .eq('setup_id', setupId);

  if (deleteError) {
    throw new Error(`Failed to clear old room items: ${deleteError.message}`);
  }

  if (validatedItems.length === 0) {
    return [];
  }

  const payload = validatedItems.map((item) => ({
    ...(item.id ? { id: item.id } : {}),
    setup_id: setupId,
    item_type: item.itemType,
    product_id: item.productId ?? null,
    variant_id: item.variantId ?? null,
    custom_image_url: item.customImageUrl ?? null,
    label: item.label ?? null,
    x_pct: item.xPct,
    y_pct: item.yPct,
    width_pct: item.widthPct,
    rotation: item.rotation ?? 0,
    flip_x: item.flipX ?? false,
    z_index: item.zIndex ?? 1,
  }));

  const { data, error: insertError } = await supabase
    .from('room_items')
    .insert(payload)
    .select('*');

  if (insertError || !data) {
    throw new Error(`Failed to insert room items: ${insertError?.message || 'Unknown error'}`);
  }

  return (data as RoomItemRow[]).map(mapRoomItemRow);
}

export async function deleteRoomSetup(id: string): Promise<boolean> {
  const supabase = await requireAdminSupabaseClient();
  if (!supabase) return true;

  const { error } = await supabase.from('room_setups').delete().eq('id', id);
  if (error) {
    throw new Error(`Failed to delete room setup: ${error.message}`);
  }
  return true;
}

export async function listDecorAssets(): Promise<DecorAsset[]> {
  const fallback = PRESET_DECOR_ASSETS;
  const supabase = createPublicSupabaseClient();
  if (!supabase) return fallback;

  try {
    const { data: files, error } = await supabase.storage
      .from('room-assets')
      .list('decor', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error || !files) {
      console.warn('[listDecorAssets] Notice (falling back to presets):', error?.message);
      return fallback;
    }

    const storageAssets: DecorAsset[] = files
      .filter((file) => file.name && !file.name.startsWith('.'))
      .map((file) => {
        const { data: publicUrl } = supabase.storage
          .from('room-assets')
          .getPublicUrl(`decor/${file.name}`);

        const cleanName = file.name
          .replace(/^upload-[a-f0-9-]+-/, '')
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .trim();

        return {
          id: file.id || `storage-${file.name}`,
          label: cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1) : 'Vật phẩm trang trí',
          customImageUrl: publicUrl.publicUrl,
          storagePath: `decor/${file.name}`,
          category: 'custom',
          createdAt: file.created_at || undefined,
        };
      });

    return [...storageAssets, ...fallback];
  } catch (err) {
    console.warn('[listDecorAssets] Notice:', err);
    return fallback;
  }
}

export async function uploadDecorAsset(input: {
  fileName: string;
  contentType: string;
  content: Buffer | ArrayBuffer;
  label?: string;
  category?: string;
}): Promise<DecorAsset> {
  let supabase: Awaited<ReturnType<typeof requireAdminSupabaseClient>> | null = null;
  try {
    supabase = await requireAdminSupabaseClient();
  } catch {
    supabase = null;
  }

  const extension = input.fileName.split('.').pop()?.toLowerCase() || 'png';
  const rawBaseName = input.fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .toLowerCase();
  const storagePath = `decor/upload-${crypto.randomUUID().slice(0, 8)}-${rawBaseName}.${extension}`;

  if (!supabase) {
    const mockId = `mock-decor-${Date.now()}`;
    return {
      id: mockId,
      label: input.label || input.fileName.replace(/\.[^/.]+$/, ''),
      customImageUrl: `/decor/${rawBaseName}.${extension}`,
      storagePath,
      category: input.category || 'custom',
      createdAt: new Date().toISOString(),
    };
  }

  const { error: uploadError } = await supabase.storage
    .from('room-assets')
    .upload(storagePath, input.content, {
      contentType: input.contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Could not upload decor asset: ${uploadError.message}`);
  }

  const { data: publicUrl } = supabase.storage
    .from('room-assets')
    .getPublicUrl(storagePath);

  return {
    id: `decor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: input.label || input.fileName.replace(/\.[^/.]+$/, ''),
    customImageUrl: publicUrl.publicUrl,
    storagePath,
    category: input.category || 'custom',
    createdAt: new Date().toISOString(),
  };
}

export async function deleteDecorAsset(storagePath: string): Promise<boolean> {
  if (!storagePath || !storagePath.startsWith('decor/')) {
    throw new Error('Đường dẫn file decor không hợp lệ.');
  }

  let supabase: Awaited<ReturnType<typeof requireAdminSupabaseClient>> | null = null;
  try {
    supabase = await requireAdminSupabaseClient();
  } catch {
    supabase = null;
  }
  if (!supabase) return true;

  const { error } = await supabase.storage.from('room-assets').remove([storagePath]);
  if (error) {
    throw new Error(`Không thể xóa decor: ${error.message}`);
  }
  return true;
}

