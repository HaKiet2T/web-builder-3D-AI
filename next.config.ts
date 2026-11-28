import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
      } catch {
        return undefined;
      }
    })()
  : undefined;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/**',
      },
      ...(supabaseHost
        ? [
            {
              protocol: (process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http://') ? 'http' : 'https') as 'http' | 'https',
              hostname: supabaseHost,
              pathname: '/**',
            },
          ]
        : []),
    ],
  },
  turbopack: {
    root: process.env.TURBOPACK_ROOT || (process.platform === "win32" ? "C:\\Users\\LEGION" : process.cwd()),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
