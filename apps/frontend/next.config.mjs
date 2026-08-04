/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // AGENT_02 scope: no auth/session logic here. API base URL is the only
  // runtime config this app owns; the authenticated client itself is
  // injected by the consuming environment (see lib/api/client.ts).
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  },
};

export default nextConfig;
