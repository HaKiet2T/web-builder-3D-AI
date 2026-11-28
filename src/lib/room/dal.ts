import 'server-only';
import { requireAdminSupabaseClient } from '@/lib/admin/auth';
import { listProducts } from '@/lib/catalog/dal';
import { PRODUCT_RECORDS } from '@/lib/catalog/sample-data';
import { PRESET_3D_MODELS, PRESET_DECOR_ASSETS, SAMPLE_ROOM_ITEMS, SAMPLE_ROOM_SETUPS } from '@/lib/room/sample-data';
import {
  RoomItemSchema,
  RoomSetupInputSchema,
  type RoomItemInput,
  type RoomSetupInput,
} from '@/lib/room/schema';
import type {
  DecorAsset,
  Model3DAsset,
  RoomItem,
  RoomSetup,
  RoomSetupWithItems,
  WindowConfig,
} from '@/lib/room/types';
import type { RoomItemRow, RoomSetupRow } from '@/lib/supabase/database.types';
import { createPublicSupabaseClient } from '@/lib/supabase/public';

async function getAdminSupabaseClientSafely() {
  try {
    return await requireAdminSupabaseClient();
  } catch {
    return null;
  }
}

function mapRoomSetupRow(row: RoomSetupRow & { wall_count?: number; wallCount?: number; windows?: WindowConfig[] }): RoomSetup {
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
    wallCount: row.wall_count || row.wallCount || 2,
    windows: Array.isArray(row.windows) ? row.windows : [],
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

// In-memory registry for dynamic room setups with JSON persistence fallback
const customRoomSetupsMap = new Map<string, RoomSetup>();
const deletedRoomSetupIds = new Set<string>();

async function getCustomRoomsFilePath(): Promise<string> {
  const path = await import('node:path');
  return path.join(process.cwd(), 'public', 'rooms-data', 'catalog-custom.json');
}

async function loadPersistedCustomRooms(): Promise<void> {
  if (process.env.NODE_TEST_CONTEXT !== undefined) {
    return;
  }
  try {
    const fs = await import('node:fs');
    const catalogPath = await getCustomRoomsFilePath();
    if (fs.existsSync(catalogPath)) {
      const raw = fs.readFileSync(catalogPath, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.setups)) {
        for (const s of data.setups) {
          customRoomSetupsMap.set(s.id, s);
          if (s.slug) {
            customRoomSetupsMap.set(s.slug, s);
          }
        }
      }
      if (Array.isArray(data.deletedIds)) {
        for (const id of data.deletedIds) {
          deletedRoomSetupIds.add(id);
        }
      }
    }
  } catch {
    // Ignore JSON read errors
  }
}

async function persistCustomRooms(): Promise<void> {
  if (process.env.NODE_TEST_CONTEXT !== undefined) {
    return;
  }
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const roomsDir = path.join(process.cwd(), 'public', 'rooms-data');
    if (!fs.existsSync(roomsDir)) {
      fs.mkdirSync(roomsDir, { recursive: true });
    }
    const catalogPath = path.join(roomsDir, 'catalog-custom.json');
    const data = {
      setups: Array.from(new Set(customRoomSetupsMap.values())),
      deletedIds: Array.from(deletedRoomSetupIds.values()),
    };
    await fs.promises.writeFile(catalogPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Ignore JSON write errors
  }
}

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
  await loadPersistedCustomRooms();
  const activeSamples = SAMPLE_ROOM_SETUPS
    .filter((s) => s.status === 'published')
    .filter((s) => !deletedRoomSetupIds.has(s.id) && !deletedRoomSetupIds.has(s.slug));
  const activeCustoms = Array.from(new Set(customRoomSetupsMap.values()))
    .filter((s) => s.status === 'published')
    .filter((s) => !deletedRoomSetupIds.has(s.id) && !deletedRoomSetupIds.has(s.slug));

  const fallback = [...activeCustoms, ...activeSamples];
  const supabase = createPublicSupabaseClient();
  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from('room_setups')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('[listPublishedRoomSetups] Notice (falling back to sample):', error?.message);
      return fallback;
    }

    const dbSetups = (data as RoomSetupRow[])
      .map(mapRoomSetupRow)
      .filter((s) => !deletedRoomSetupIds.has(s.id) && !deletedRoomSetupIds.has(s.slug));

    const seenIds = new Set(dbSetups.map((s) => s.id));
    const seenSlugs = new Set(dbSetups.map((s) => s.slug));
    const merged = [...dbSetups];

    for (const item of fallback) {
      if (!seenIds.has(item.id) && !seenSlugs.has(item.slug)) {
        merged.push(item);
        seenIds.add(item.id);
        seenSlugs.add(item.slug);
      }
    }

    return merged;
  } catch (error) {
    console.warn('[listPublishedRoomSetups] Notice (falling back to sample):', error);
    return fallback;
  }
}

export async function getRoomSetupBySlug(
  slug: string,
): Promise<RoomSetupWithItems | null> {
  await loadPersistedCustomRooms();
  if (deletedRoomSetupIds.has(slug)) {
    return null;
  }
  const custom = customRoomSetupsMap.get(slug);
  const sample = SAMPLE_ROOM_SETUPS.find((s) => s.slug === slug);
  const fallback = custom
    ? { ...custom, items: [], comboPricing: calculateComboPricing([], custom.comboDiscountPct) }
    : sample && !deletedRoomSetupIds.has(sample.id)
      ? getSampleRoomSetupBySlug(slug)
      : null;
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
  await loadPersistedCustomRooms();
  if (deletedRoomSetupIds.has(id)) {
    return null;
  }
  const custom = customRoomSetupsMap.get(id);
  const sample = SAMPLE_ROOM_SETUPS.find((s) => s.id === id);
  const fallback = custom
    ? {
        ...custom,
        items: [],
        comboPricing: calculateComboPricing([], custom.comboDiscountPct),
      }
    : sample && !deletedRoomSetupIds.has(sample.slug)
      ? getSampleRoomSetupBySlug(sample.slug)
      : null;
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
  await loadPersistedCustomRooms();
  const activeSamples = SAMPLE_ROOM_SETUPS.filter(
    (s) => !deletedRoomSetupIds.has(s.id) && !deletedRoomSetupIds.has(s.slug),
  );
  const activeCustoms = Array.from(new Set(customRoomSetupsMap.values())).filter(
    (s) => !deletedRoomSetupIds.has(s.id) && !deletedRoomSetupIds.has(s.slug),
  );

  const supabase = await getAdminSupabaseClientSafely();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('room_setups')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!error && data) {
        const dbSetups = (data as RoomSetupRow[])
          .map(mapRoomSetupRow)
          .filter((s) => !deletedRoomSetupIds.has(s.id) && !deletedRoomSetupIds.has(s.slug));

        const seenIds = new Set(dbSetups.map((s) => s.id));
        const seenSlugs = new Set(dbSetups.map((s) => s.slug));
        const merged: RoomSetup[] = [...dbSetups];

        for (const custom of activeCustoms) {
          if (!seenIds.has(custom.id) && !seenSlugs.has(custom.slug)) {
            merged.push(custom);
            seenIds.add(custom.id);
            seenSlugs.add(custom.slug);
          }
        }

        for (const sample of activeSamples) {
          if (!seenIds.has(sample.id) && !seenSlugs.has(sample.slug)) {
            merged.push(sample);
            seenIds.add(sample.id);
            seenSlugs.add(sample.slug);
          }
        }

        return merged;
      }
    } catch {
      // Fall through to active memory items
    }
  }

  const seenIds = new Set<string>();
  const merged: RoomSetup[] = [];
  for (const item of [...activeCustoms, ...activeSamples]) {
    if (!seenIds.has(item.id)) {
      merged.push(item);
      seenIds.add(item.id);
    }
  }
  return merged;
}

export async function upsertRoomSetup(input: RoomSetupInput): Promise<RoomSetup> {
  await loadPersistedCustomRooms();
  const validated = RoomSetupInputSchema.parse(input);
  if (validated.id) {
    deletedRoomSetupIds.delete(validated.id);
  }
  deletedRoomSetupIds.delete(validated.slug);

  const supabase = await getAdminSupabaseClientSafely();

  if (!supabase) {
    const existing = SAMPLE_ROOM_SETUPS.find(
      (s) => (validated.id && s.id === validated.id) || s.slug === validated.slug,
    );
    const now = new Date().toISOString();
    const setup: RoomSetup = {
      id: validated.id || existing?.id || `setup_${Date.now()}`,
      slug: validated.slug,
      title: validated.title,
      description: validated.description || '',
      bgImageUrl: validated.bgImageUrl,
      aspectRatio: validated.aspectRatio ?? 1.6,
      status: validated.status ?? 'draft',
      comboDiscountPct: validated.comboDiscountPct ?? 0,
      sortOrder: validated.sortOrder ?? 0,
      wallCount: validated.wallCount ?? existing?.wallCount ?? 2,
      windows: validated.windows ?? existing?.windows ?? [],
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    customRoomSetupsMap.set(setup.id, setup);
    customRoomSetupsMap.set(setup.slug, setup);
    await persistCustomRooms();
    return setup;
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

  try {
    const { data, error } = await supabase
      .from('room_setups')
      .upsert(payload, { onConflict: 'slug' })
      .select('*')
      .single();

    if (error || !data) {
      console.warn('[upsertRoomSetup] Supabase notice, using memory fallback:', error?.message);
      const existing = SAMPLE_ROOM_SETUPS.find(
        (s) => (validated.id && s.id === validated.id) || s.slug === validated.slug,
      );
      const now = new Date().toISOString();
      const setup: RoomSetup = {
        id: validated.id || existing?.id || `setup_${Date.now()}`,
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
      customRoomSetupsMap.set(setup.id, setup);
      customRoomSetupsMap.set(setup.slug, setup);
      await persistCustomRooms();
      return setup;
    }

    const saved = mapRoomSetupRow(data as RoomSetupRow);
    customRoomSetupsMap.set(saved.id, saved);
    customRoomSetupsMap.set(saved.slug, saved);
    await persistCustomRooms();
    return saved;
  } catch (err: unknown) {
    console.warn('[upsertRoomSetup] Supabase exception, using memory fallback:', err);
    const existing = SAMPLE_ROOM_SETUPS.find(
      (s) => (validated.id && s.id === validated.id) || s.slug === validated.slug,
    );
    const now = new Date().toISOString();
    const setup: RoomSetup = {
      id: validated.id || existing?.id || `setup_${Date.now()}`,
      slug: validated.slug,
      title: validated.title,
      description: validated.description || '',
      bgImageUrl: validated.bgImageUrl,
      aspectRatio: validated.aspectRatio ?? 1.6,
      status: validated.status ?? 'draft',
      comboDiscountPct: validated.comboDiscountPct ?? 0,
      sortOrder: validated.sortOrder ?? 0,
      wallCount: validated.wallCount ?? existing?.wallCount ?? 2,
      windows: validated.windows ?? existing?.windows ?? [],
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    customRoomSetupsMap.set(setup.id, setup);
    customRoomSetupsMap.set(setup.slug, setup);
    await persistCustomRooms();
    return setup;
  }
}

export async function saveRoomItems(
  setupId: string,
  items: RoomItemInput[],
): Promise<RoomItem[]> {
  const validatedItems = items.map((item) => RoomItemSchema.parse(item));
  const supabase = await getAdminSupabaseClientSafely();

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

  try {
    const { error: deleteError } = await supabase
      .from('room_items')
      .delete()
      .eq('setup_id', setupId);

    if (deleteError) {
      console.warn('[saveRoomItems] Notice clearing items:', deleteError.message);
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
      console.warn('[saveRoomItems] Notice inserting items:', insertError?.message);
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

    return (data as RoomItemRow[]).map(mapRoomItemRow);
  } catch (err: unknown) {
    console.warn('[saveRoomItems] Exception saving items:', err);
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
}

export async function clearAllSampleRooms(): Promise<boolean> {
  await loadPersistedCustomRooms();
  for (const sample of SAMPLE_ROOM_SETUPS) {
    deletedRoomSetupIds.add(sample.id);
    deletedRoomSetupIds.add(sample.slug);
  }
  await persistCustomRooms();

  const supabase = await getAdminSupabaseClientSafely();
  if (supabase) {
    for (const sample of SAMPLE_ROOM_SETUPS) {
      try {
        await supabase.from('room_items').delete().eq('setup_id', sample.id);
        await supabase.from('room_setups').delete().or(`id.eq.${sample.id},slug.eq.${sample.slug}`);
      } catch (err: unknown) {
        console.warn('[clearAllSampleRooms] Notice deleting sample from DB:', err);
      }
    }
  }
  return true;
}

export async function deleteRoomSetup(id: string): Promise<boolean> {
  await loadPersistedCustomRooms();
  deletedRoomSetupIds.add(id);

  const matchedSample = SAMPLE_ROOM_SETUPS.find((s) => s.id === id || s.slug === id);
  if (matchedSample) {
    deletedRoomSetupIds.add(matchedSample.id);
    deletedRoomSetupIds.add(matchedSample.slug);
  }

  const matchedCustom = customRoomSetupsMap.get(id);
  if (matchedCustom) {
    deletedRoomSetupIds.add(matchedCustom.id);
    deletedRoomSetupIds.add(matchedCustom.slug);
    customRoomSetupsMap.delete(id);
    customRoomSetupsMap.delete(matchedCustom.id);
    customRoomSetupsMap.delete(matchedCustom.slug);
  }

  await persistCustomRooms();

  const supabase = await getAdminSupabaseClientSafely();
  if (!supabase) return true;

  try {
    await supabase.from('room_items').delete().eq('setup_id', id);
    const { error } = await supabase.from('room_setups').delete().or(`id.eq.${id},slug.eq.${id}`);
    if (error) {
      console.warn('[deleteRoomSetup] Notice:', error.message);
      return true;
    }
    return true;
  } catch (err: unknown) {
    console.warn('[deleteRoomSetup] Exception:', err);
    return true;
  }
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
  const supabase = await getAdminSupabaseClientSafely();

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

  const supabase = await getAdminSupabaseClientSafely();
  if (!supabase) return true;

  const { error } = await supabase.storage.from('room-assets').remove([storagePath]);
  if (error) {
    throw new Error(`Không thể xóa decor: ${error.message}`);
  }
  return true;
}

export { PRESET_3D_MODELS };

// In-memory registry for dynamic 3D models with JSON persistence fallback
const customModelsMap = new Map<string, Model3DAsset>();
const deletedModelIds = new Set<string>();

async function getCustomCatalogFilePath(): Promise<string> {
  const path = await import('node:path');
  return path.join(process.cwd(), 'public', 'models3d', 'catalog-custom.json');
}

async function loadPersistedCustomModels(): Promise<void> {
  try {
    const fs = await import('node:fs');
    const catalogPath = await getCustomCatalogFilePath();
    if (fs.existsSync(catalogPath)) {
      const raw = fs.readFileSync(catalogPath, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.models)) {
        for (const m of data.models) {
          customModelsMap.set(m.id, m);
        }
      }
      if (Array.isArray(data.deletedIds)) {
        for (const id of data.deletedIds) {
          deletedModelIds.add(id);
        }
      }
    }
  } catch {
    // Ignore JSON read errors
  }
}

async function persistCustomModels(): Promise<void> {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const modelsDir = path.join(process.cwd(), 'public', 'models3d');
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }
    const catalogPath = path.join(modelsDir, 'catalog-custom.json');
    const data = {
      models: Array.from(customModelsMap.values()),
      deletedIds: Array.from(deletedModelIds.values()),
    };
    await fs.promises.writeFile(catalogPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Ignore JSON write errors
  }
}

export async function list3DModelAssets(): Promise<Model3DAsset[]> {
  await loadPersistedCustomModels();
  const fs = await import('node:fs');
  const path = await import('node:path');
  const modelsDir = path.join(process.cwd(), 'public', 'models3d');
  const diskModels: Model3DAsset[] = [];

  try {
    if (fs.existsSync(modelsDir)) {
      const files = fs.readdirSync(modelsDir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.glb')) {
          if (file.toLowerCase().startsWith('test-')) {
            continue;
          }
          const matchedPreset = PRESET_3D_MODELS.find((p) => p.modelUrl.endsWith(`/${file}`));
          if (!matchedPreset) {
            const stats = fs.statSync(path.join(modelsDir, file));
            const cleanLabel = file
              .replace(/\.glb$/i, '')
              .replace(/[-_]+/g, ' ')
              .trim();
            diskModels.push({
              id: `disk-${file}`,
              label: cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1),
              modelUrl: `/models3d/${file}`,
              fileSize: stats.size,
              category: 'custom',
              createdAt: stats.birthtime.toISOString(),
            });
          }
        }
      }
    }
  } catch {
    // Ignore fs errors in edge/restricted environments
  }

  // Base list combines presets and disk-detected files
  const baseList = [...PRESET_3D_MODELS, ...diskModels];

  // Map to apply updates or overrides
  const resultMap = new Map<string, Model3DAsset>();
  for (const item of baseList) {
    if (!deletedModelIds.has(item.id)) {
      resultMap.set(item.id, item);
    }
  }

  // Overlay custom items and updates
  for (const [id, customItem] of customModelsMap.entries()) {
    if (!deletedModelIds.has(id)) {
      resultMap.set(id, customItem);
    }
  }

  return Array.from(resultMap.values());
}

export async function create3DModelAsset(input: {
  label: string;
  category?: string;
  modelUrl?: string;
  storagePath?: string | null;
  fileSize?: number;
}): Promise<Model3DAsset> {
  await loadPersistedCustomModels();
  const cleanLabel = input.label.trim();
  if (!cleanLabel) {
    throw new Error('Tên vật thể 3D không được để trống.');
  }

  const id = `model3d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const asset: Model3DAsset = {
    id,
    label: cleanLabel,
    category: input.category?.trim() || 'furniture',
    modelUrl: input.modelUrl?.trim() || `/models3d/${cleanLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.glb`,
    storagePath: input.storagePath || null,
    fileSize: input.fileSize || 0,
    createdAt: new Date().toISOString(),
  };

  customModelsMap.set(id, asset);
  deletedModelIds.delete(id);
  await persistCustomModels();
  return asset;
}

export async function update3DModelAsset(
  id: string,
  updates: {
    label?: string;
    category?: string;
    modelUrl?: string;
  }
): Promise<Model3DAsset> {
  await loadPersistedCustomModels();
  const models = await list3DModelAssets();
  const existing = models.find((m) => m.id === id);
  if (!existing) {
    throw new Error(`Không tìm thấy vật thể 3D với ID: ${id}`);
  }

  const updated: Model3DAsset = {
    ...existing,
    label: updates.label !== undefined ? updates.label.trim() : existing.label,
    category: updates.category !== undefined ? updates.category.trim() : existing.category,
    modelUrl: updates.modelUrl !== undefined ? updates.modelUrl.trim() : existing.modelUrl,
  };

  customModelsMap.set(id, updated);
  deletedModelIds.delete(id);
  await persistCustomModels();
  return updated;
}

export async function delete3DModelAsset(id: string): Promise<boolean> {
  await loadPersistedCustomModels();
  deletedModelIds.add(id);
  const existing = customModelsMap.get(id);
  customModelsMap.delete(id);
  await persistCustomModels();

  // Try to clean up local disk file if it's a disk model or uploaded model with /models3d/ path
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    let fileName: string | null = null;
    if (id.startsWith('disk-')) {
      fileName = id.replace(/^disk-/, '');
    } else if (existing?.modelUrl?.startsWith('/models3d/')) {
      fileName = existing.modelUrl.replace(/^\/models3d\//, '');
    }
    if (fileName) {
      const filePath = path.join(process.cwd(), 'public', 'models3d', fileName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }
  } catch {
    // Ignore deletion failure
  }

  return true;
}

export async function upload3DModelAsset(input: {
  fileName: string;
  content: Buffer | ArrayBuffer;
  label?: string;
  category?: string;
  skipDiskWrite?: boolean;
}): Promise<Model3DAsset> {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const buffer = Buffer.isBuffer(input.content) ? input.content : Buffer.from(input.content);

  const cleanBaseName = input.fileName
    .replace(/\.glb$/i, '')
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .toLowerCase();
  const safeFileName = `${cleanBaseName}-${Date.now().toString(36)}.glb`;
  const modelsDir = path.join(process.cwd(), 'public', 'models3d');

  if (!input.skipDiskWrite) {
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    const destPath = path.join(modelsDir, safeFileName);
    await fs.promises.writeFile(destPath, buffer);
  }

  const modelUrl = `/models3d/${safeFileName}`;
  const label = input.label || input.fileName.replace(/\.glb$/i, '');

  let storagePath: string | null = null;
  if (!input.skipDiskWrite) {
    const supabase = await getAdminSupabaseClientSafely();
    if (supabase) {
      try {
        storagePath = `models/${safeFileName}`;
        await supabase.storage.from('room-assets').upload(storagePath, buffer, {
          contentType: 'model/gltf-binary',
          upsert: true,
        });
      } catch {
        // Continue with local public serving
      }
    }
  }

  const modelAsset: Model3DAsset = {
    id: `model3d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    modelUrl,
    storagePath,
    fileSize: buffer.byteLength,
    category: input.category || 'custom',
    createdAt: new Date().toISOString(),
  };

  if (!input.skipDiskWrite) {
    await loadPersistedCustomModels();
    customModelsMap.set(modelAsset.id, modelAsset);
    deletedModelIds.delete(modelAsset.id);
    await persistCustomModels();
  }

  return modelAsset;
}


