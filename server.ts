import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// --- DEEZER PROXY ENDPOINTS ---
app.get('/api/deezer/track/:id', async (req, res) => {
  try {
    const response = await fetch(`https://api.deezer.com/track/${req.params.id}`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Deezer track fetch failed' });
  }
});

app.get('/api/deezer/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const limit = req.query.limit || 50;
    const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(String(q))}&limit=${limit}`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Deezer search failed' });
  }
});

app.get('/api/deezer/search/artist', async (req, res) => {
  try {
    const q = req.query.q || '';
    const limit = req.query.limit || 50;
    const response = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(String(q))}&limit=${limit}`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Deezer artist search failed' });
  }
});

app.get('/api/deezer/search/album', async (req, res) => {
  try {
    const q = req.query.q || '';
    const limit = req.query.limit || 50;
    const response = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(String(q))}&limit=${limit}`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Deezer album search failed' });
  }
});

app.get('/api/deezer/artist/:id/top', async (req, res) => {
  try {
    const limit = req.query.limit || 250;
    const response = await fetch(`https://api.deezer.com/artist/${req.params.id}/top?limit=${limit}`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Deezer top tracks fetch failed' });
  }
});

app.get('/api/deezer/artist/:id/albums', async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const response = await fetch(`https://api.deezer.com/artist/${req.params.id}/albums?limit=${limit}`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Deezer artist albums fetch failed' });
  }
});

app.get('/api/deezer/artist/:id', async (req, res) => {
  try {
    const response = await fetch(`https://api.deezer.com/artist/${req.params.id}`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Deezer artist details fetch failed' });
  }
});

app.get('/api/deezer/album/:id/tracks', async (req, res) => {
  try {
    const limit = req.query.limit || 100;
    const response = await fetch(`https://api.deezer.com/album/${req.params.id}/tracks?limit=${limit}`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Deezer album tracks fetch failed' });
  }
});

app.get('/api/deezer/album/:id', async (req, res) => {
  try {
    const response = await fetch(`https://api.deezer.com/album/${req.params.id}`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Deezer album details fetch failed' });
  }
});

app.get('/api/deezer/audio-proxy', async (req, res) => {
  const audioUrl = req.query.url as string;
  if (!audioUrl) {
    return res.status(400).json({ error: 'Missing audio url' });
  }
  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      return res.status(audioRes.status).send('Failed to fetch audio stream');
    }
    const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    const arrayBuffer = await audioRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Audio proxy error' });
  }
});

// Health check endpoint for Cloud Run and uptime checks
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Full-stack Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('dist/ folder not found. Please build the client first using npm run build.');
      app.get('*', (_req, res) => {
        res.status(503).send('Application is building. Please refresh in a moment.');
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PackTunes server running on port ${PORT} (host 0.0.0.0)`);
  });
}

startServer();

