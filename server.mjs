import { spawn } from 'child_process';
import express from 'express';

// Create a simple Express API server on port 3001
const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API server is running' });
});

app.get('/api/db-test', async (req, res) => {
  res.json({ status: 'Database placeholder - will be implemented', message: 'API working' });
});

app.listen(3001, '0.0.0.0', () => {
  console.log('API server running on port 3001');
});

// Start Vite on port 5000 with proxy
const viteProcess = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '5000'], {
  stdio: 'inherit',
  env: { ...process.env }
});

viteProcess.on('error', (err) => {
  console.error('Failed to start Vite:', err);
  process.exit(1);
});

viteProcess.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
  process.exit(code);
});