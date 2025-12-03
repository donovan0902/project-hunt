import type { NextConfig } from "next";

// Dynamically set WORKOS_REDIRECT_URI based on the deployment environment
const getWorkosRedirectUri = () => {
  // If explicitly set, use that (for local development)
  if (process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI) {
    return process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
  }
  // For Vercel deployments
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/callback`;
  }
  // Fallback for local development
  return 'http://localhost:3000/callback';
};

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      new URL('https://workoscdn.com/**'),
    ],
  },
  env: {
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: getWorkosRedirectUri(),
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
