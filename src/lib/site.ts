/**
 * Single source of truth for store identity.
 *
 * The header, metadata and footer used to hard-code three different names
 * ("Forma" in the header/footer, "HGK" in the metadata), so a rename meant
 * editing five files and hoping none was missed. Everything user-visible now
 * reads from here.
 */
export const SITE = {
  /** Short brand mark shown in the header and the footer. */
  name: 'HGK',
  /** Sub-line that explains what the store sells. */
  tagline: 'Thiết bị setup góc làm việc',
  /** Used for the root metadata description and the home intro. */
  description:
    'Màn hình, loa, chuột, bàn phím và đèn màn hình cho góc máy của bạn.',
} as const;

/** `HGK | Thiết bị setup góc làm việc` — the default document title. */
export const SITE_TITLE = `${SITE.name} | ${SITE.tagline}`;

/** Title template for every nested route: `Giỏ hàng | HGK`. */
export const SITE_TITLE_TEMPLATE = `%s | ${SITE.name}`;