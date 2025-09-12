import { createServer as createViteServer } from 'vite';
import express from 'express';
import authRoutes from './server/api/auth.mjs';
import contentRoutes from './server/api/content.mjs';
import { db } from './server/db.mjs';

async function createServer() {
  const app = express();
  
  // Parse JSON bodies
  app.use(express.json());
  
  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server running with Vite and API on port 5000' });
  });
  
  app.get('/api/db-test', async (req, res) => {
    try {
      const result = await db.execute('SELECT 1 as test');
      res.json({ status: 'Database connected', result: result.rows });
    } catch (error) {
      console.error('Database test error:', error);
      res.status(500).json({ status: 'Database connection failed', error: error.message });
    }
  });
  
  // Add authentication and content routes
  app.use('/api/auth', authRoutes);
  app.use('/api/content', contentRoutes);
  
  // Serve static files from dist in production
  if (process.env.NODE_ENV === 'production') {
    const path = await import('path');
    app.use(express.static(path.resolve('dist')));
  }
  
  // Create Vite server in middleware mode only in development
  let vite;
  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        hmr: {
          port: 5001
        }
      },
      appType: 'spa'
    });
    
    // Use vite's connect instance as middleware
    app.use(vite.middlewares);
  }
  
  // In production, add SPA fallback for non-API routes
  if (process.env.NODE_ENV === 'production') {
    app.get(/.*/, (req, res) => {
      // Skip API routes
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).send('API endpoint not found');
      }
      
      // Serve index.html for all other routes
      const path = require('path');
      res.sendFile(path.resolve('dist/index.html'));
    });
  }
  
  const port = process.env.PORT || 5000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
    console.log(`API endpoints available at http://0.0.0.0:${port}/api/health`);
  });
}

createServer().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});