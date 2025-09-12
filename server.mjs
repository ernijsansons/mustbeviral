import { createServer as createViteServer } from 'vite';
import express from 'express';

async function createServer() {
  const app = express();
  
  // Parse JSON bodies
  app.use(express.json());
  
  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server running with Vite and API on port 5000' });
  });
  
  app.get('/api/db-test', async (req, res) => {
    res.json({ status: 'Database placeholder - will be implemented', message: 'API working' });
  });
  
  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      host: '0.0.0.0'
    },
    appType: 'spa'
  });
  
  // Use vite's connect instance as middleware
  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);
  
  const port = 5000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
    console.log(`API endpoints available at http://0.0.0.0:${port}/api/health`);
  });
}

createServer().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});