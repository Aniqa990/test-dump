/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Temporarily disable reactCompiler to avoid CSP issues
  // reactCompiler: true,
  // Use Turbopack (default in Next.js 16)
  turbopack: {},
};

export default nextConfig;
