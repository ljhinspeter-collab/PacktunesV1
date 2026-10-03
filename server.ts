import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Basic security and parsing
app.use(express.json());

// Health check endpoint for Cloud Run and uptime checks
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Serve static assets from dist
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback: any route that is not a static asset returns index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.warn('dist/ folder not found. Please build the client first using npm run build.');
  app.get('*', (_req, res) => {
    res.status(503).send('Application is building. Please refresh in a moment.');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PackTunes server running on port ${PORT} (host 0.0.0.0)`);
});
