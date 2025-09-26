import express, { Request, Response, Application } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// API routes
app.get('/api/health', (req: Request, res: Response): void => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Test database connection
app.get('/api/db-test', async (req: Request, res: Response): Promise<void> => {
  try {
    // Simple query to test connection
    const result = await db.execute('SELECT 1 as test');
    res.json({ status: 'Database connected', result });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Database connection error:', error);
    res.status(500).json({ status: 'Database connection failed', error: errorMessage });
  }
});

// Serve React app for all other routes
app.get(/.*/, (req: Request, res: Response): void => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});