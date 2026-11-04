import { SITE } from '@/lib/site';

/**
 * Shared page footer. It used to be copy-pasted into every page with a
 * different brand string, which is how the site ended up showing "Forma"
 * in the footer while the metadata said "HGK".
 */
export function SiteFooter() {
  return (
    <footer className="home-footer">
      <span>{SITE.name}</span>
      <span>{SITE.tagline}</span>
    </footer>
  );
}