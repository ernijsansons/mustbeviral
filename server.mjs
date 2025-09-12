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
        host: '0.0.0.0'
      },
      appType: 'custom'
    });
    
    // Use vite's connect instance as middleware
    app.use(vite.middlewares);
  }
  
  // Add SPA fallback for HTML requests only
  app.use(async (req, res, next) => {
    // Skip API routes
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    
    // Only handle HTML requests
    const accept = req.headers.accept || '';
    if (!accept.includes('text/html')) {
      return next();
    }
    
    try {
      // In development, use Vite to transform and serve index.html
      if (process.env.NODE_ENV !== 'production') {
        const fs = await import('fs/promises');
        const template = await fs.readFile('index.html', 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } else {
        // In production, serve from dist
        const path = await import('path');
        res.sendFile(path.resolve('dist/index.html'));
      }
    } catch (error) {
      console.error('Error serving SPA:', error);
      next(error);
    }
  });
  
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