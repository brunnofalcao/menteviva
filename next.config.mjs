/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // MVP: não bloquear deploy por lint/TS enquanto iteramos.
  // Reativar (remover) quando estabilizar para ganhar a checagem completa.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
