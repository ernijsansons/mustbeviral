import { createServer as createViteServer } from 'vite';
import express from 'express';
import session from 'express-session';
import { db } from './db.js';
import authRoutes from './api/auth.js';
import contentRoutes from './api/content.js';
import onboardRoutes from './api/onboard.js';
import oauthRoutes from './api/oauth.js';

async function createServer() {
  const app = express();
  
  // Parse JSON bodies
  app.use(express.json());
  
  // Session configuration for OAuth state management
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 10 * 60 * 1000 // 10 minutes for OAuth flows
    }
  }));
  
  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server running with Vite and API on port 5000' });
  });
  
  app.get('/api/db-test', async (req, res) => {
    if (!db) {
      return res.status(500).json({ status: 'Database connection failed', error: 'Could not initialize database' });
    }
    
    try {
      const result = await db.execute('SELECT 1 as test');
      res.json({ status: 'Database connected', result });
    } catch (error) {
      console.error('Database test error:', error);
      res.status(500).json({ status: 'Database connection failed', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Add authentication and content routes
  app.use('/api/auth', authRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/onboard', onboardRoutes);
  app.use('/api/oauth', oauthRoutes);
  
  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: {
        port: 5001
      }
    }
  });
  
  // Use vite's connect instance as middleware
  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);
  
  return { app, vite };
}

createServer().then(async ({ app, vite }) => {
  const port = 5000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
    console.log(`API endpoints available at http://0.0.0.0:${port}/api/health`);
  });
}).catch((error) => {
  console.error('Server startup error:', error);
  process.exit(1);
});