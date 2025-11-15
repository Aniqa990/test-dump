/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Temporarily disable reactCompiler to avoid CSP issues
  // reactCompiler: true,
  // Disable Turbopack to avoid internal errors - use webpack instead
  // turbopack: {},
  // Allow cross-origin requests from network IP
  allowedDevOrigins: ["192.168.56.1"],
};

export default nextConfig;
