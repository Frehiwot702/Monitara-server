// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const API_KEY = process.env.LOG_API_KEY;

// Paths
const LOG_FILE = path.join(__dirname, 'logs.json');

// Ensure logs.json exists
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '[]');
  console.log('✅ Created logs.json');
}

// Middleware
app.use(cors());
app.use(express.json());

// API key middleware
app.use((req, res, next) => {
  if (!API_KEY) return next();
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// POST /log
app.post('/log', (req, res) => {
  const newLog = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...req.body,
  };

  const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
  logs.push(newLog);

  if (logs.length > 1000) logs.shift();

  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  console.log(`✅ Logged: ${newLog.type}`);

  res.json({ success: true, id: newLog.id });
});

// GET /logs
app.get('/logs', (req, res) => {
  try {
    const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// Health check
app.get('/', (_, res) => {
  res.send('Logging server running 🚀');
});

app.listen(PORT, () => {
  console.log(`✅ Logging Server running on port ${PORT}`);
});
