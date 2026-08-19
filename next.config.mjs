/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.cupid.travel",
      },
    ],
  },
}

export default nextConfig
