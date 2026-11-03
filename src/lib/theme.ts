/**
 * Theme constants shared by the server layout and the client provider.
 *
 * This module must stay free of `'use client'`: a server component importing a
 * value from a client module receives an opaque client reference instead of the
 * string, which silently breaks the pre-paint bootstrap.
 */

export type Theme = 'light' | 'dark';

/** Key used by the shared storefront theme. */
export const THEME_STORAGE_KEY = 'store-theme';

/** Key used by the original monitor page, migrated on first load. */
export const LEGACY_THEME_STORAGE_KEY = 'monitor-storefront-theme';
