import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app.js';

async function startServer() {
  const app = createApp();
  const PORT = Number(process.env.PORT) || 3000;

  // ==========================================
  // Vite Integration & Static Frontend Serving
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`MediGuard AI Server running at http://localhost:${PORT}`);
  });
}

startServer();
