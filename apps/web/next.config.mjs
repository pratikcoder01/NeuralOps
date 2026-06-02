/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["avatars.githubusercontent.com", "lh3.googleusercontent.com"],
  },
  // Note: serverComponentsExternalPackages moved to top-level in Next.js 14.2+
  serverExternalPackages: ["d3"],
};

export default nextConfig;
