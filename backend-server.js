/*
 * Lightweight Express server that powers the demo API layer.
 * Run with `npm install` (repo root) then `npm run dev` while
 * the CRA app points at http://localhost:3004/api.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const projectsRouter = require('./api/projects');
const debugRouter = require('./api/debug');

const app = express();
const PORT = Number(process.env.API_PORT || process.env.PORT || 3004);

const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(
  cors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.API_LOG_FORMAT || 'dev'));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/projects', projectsRouter);
app.use('/api/debug', debugRouter);

// Basic error handler so unhandled exceptions do not crash the server.
app.use((err, req, res, next) => {
  console.error('API error:', err);
  res.status(500).json({ success: false, error: 'Internal API error' });
});

app.listen(PORT, () => {
  console.log(`NetSuite demo API listening on http://localhost:${PORT}`);
});
