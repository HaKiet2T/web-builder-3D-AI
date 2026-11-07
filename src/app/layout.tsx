import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { FilmGrain } from "@/components/ui/FilmGrain";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { listCategories } from "@/lib/catalog/dal";
import { LEGACY_THEME_STORAGE_KEY, THEME_STORAGE_KEY } from "@/lib/theme";
import { SITE, SITE_TITLE, SITE_TITLE_TEMPLATE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE,
    template: SITE_TITLE_TEMPLATE,
  },
  description: SITE.description,
};

// Runs synchronously in <head>, before first paint, so the saved theme never
// flashes. It also migrates the key used by the original monitor page.
// The keys come from a plain (non client) module: importing them from a
// 'use client' file would hand this server component a client reference.
const themeBootstrap = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);if(s!=='light'&&s!=='dark'){s=localStorage.getItem(${JSON.stringify(LEGACY_THEME_STORAGE_KEY)});if(s==='light'||s==='dark')localStorage.setItem(k,s);}var isDark=s==='dark';document.documentElement.dataset.theme=isDark?'dark':'light';if(isDark){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){document.documentElement.dataset.theme='light';document.documentElement.classList.remove('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script id="theme-bootstrap" dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <FilmGrain />
          <CartDrawer />
          {/* The header reads usePathname() to highlight the current category,
              which suspends on routes whose dynamic params are not prerendered.
              Wrapping it keeps the rest of the layout prerenderable. The
              fallback reserves the same header height so nothing shifts. */}
          <Suspense fallback={<div className="site-header" data-variant="solid" aria-hidden="true" />}>
            <CatalogueHeader />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

async function CatalogueHeader() {
  const categories = await listCategories();
  return <SiteHeader categories={categories} />;
}
