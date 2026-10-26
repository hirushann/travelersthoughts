import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Match the WordPress URLs (/post-slug/) so existing rankings carry over without redirects.
  trailingSlash: true,
  poweredByHeader: false,
  images: {
    qualities: [75, 85],
    formats: ["image/avif", "image/webp"],
    // Every image is served from /uploads/ on this site; no remote hosts are allowed.
    localPatterns: [{ pathname: "/uploads/**" }, { pathname: "/_next/**" }],
  },
  async redirects() {
    return [
      // Old WordPress addresses.
      { source: "/feed/", destination: "/rss.xml", permanent: true },
      { source: "/comments/feed/", destination: "/rss.xml", permanent: true },
      { source: "/wp-admin/:path*", destination: "/admin/", permanent: true },
      { source: "/wp-login.php", destination: "/admin/login/", permanent: true },
      { source: "/wp-content/uploads/:path*", destination: "/uploads/:path*", permanent: true },
      { source: "/sitemap_index.xml", destination: "/sitemap.xml", permanent: true },
      { source: "/sitemap/", destination: "/sitemap.xml", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
