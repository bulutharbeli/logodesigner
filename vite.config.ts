import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { routeRequest } from './server/proxy-core.js';

/**
 * Geliştirme/önizleme sunucusunda /api/proxy ucunu ayağa kaldırır.
 * Böylece uygulama yerelde de production ile birebir aynı davranır
 * (tarayıcı -> proxy -> Pollinations).
 */
function brandforgeProxy(): Plugin {
  const handler = async (req: any, res: any) => {
    try {
      let rawBody = null;
      if (req.method === 'POST') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        rawBody = Buffer.concat(chunks).toString('utf8');
      }
      const result = await routeRequest({
        url: req.url || '/',
        method: req.method,
        body: rawBody,
        env: process.env,
      });
      res.statusCode = result.status;
      for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
      res.end(result.body);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
  };

  return {
    name: 'brandforge-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/proxy', handler);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), brandforgeProxy()],
  // allowedHosts: true → sandbox önizleme host'unun (e2b.app) engellenmemesi için.
  // Dağıtımda bu satırı kaldırabilirsiniz.
  server: { host: '0.0.0.0', port: 5173, strictPort: false, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: false, allowedHosts: true },
  build: { target: 'es2020', chunkSizeWarningLimit: 1500 },
});
