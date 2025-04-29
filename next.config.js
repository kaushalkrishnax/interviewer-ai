/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [new URL("https://images.unsplash.com")],
  },
};

export default nextConfig;
