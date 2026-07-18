/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost', port: '3000', pathname: '/uploads/**' },
      { protocol: 'https', hostname: '**', pathname: '/**' },
    ],
    // El contenedor `portal` corre en una red Docker sin salida a internet
    // (ver docker-compose.prod.yml), así que el fetch server-side de
    // /_next/image nunca alcanza el bucket público de R2. Con unoptimized
    // el navegador pide la imagen directo a R2 en vez de pasar por el server.
    unoptimized: true,
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
