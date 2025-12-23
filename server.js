// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const API_KEY = process.env.NEXT_PUBLIC_LOG_API_KEY;

// Paths
const LOG_FILE = path.join(__dirname, 'logs.json');

// Ensure logs.json exists
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '[]');
  console.log('✅ Created logs.json');
}

// Middleware
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'x-project-code'],
  methods: ['GET', 'POST', 'DELETE'],
}));

app.use(express.json());

// API key middleware
app.use((req, res, next) => {
  const code =
    req.headers['x-project-code'] ||
    req.query.code ||
    (req.body && req.body.code);

  if (!code) {
    return res.status(401).json({
      error: 'Project code required',
    });
  }

  req.projectCode = code;
  next();
});


// POST /log
app.post('/log', (req, res) => {
  const newLog = {
    id: Date.now(),
    code: req.projectCode,
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
    const filtered = logs.filter(
      (log) => log.code === req.projectCode
    );
    res.json(filtered);
  } catch {
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// Health check
app.get('/', (_, res) => {
  res.send('Logging server running 🚀');
});

app.delete('/logs', (req, res) => {
  if (!req.projectCode) {
    return res.status(400).json({
      success: false,
      error: 'Project code is required',
    });
  }

  let logs = [];
  try {
    const fileData = fs.readFileSync(LOG_FILE, 'utf-8');
    logs = JSON.parse(fileData || '[]');
  } catch (err) {
    console.error('Failed to read logs.json', err);
    return res.status(500).json({ error: 'Failed to read logs' });
  }

  const remainingLogs = logs.filter(
    (log) => log.code !== req.projectCode
  );

  const deletedCount = logs.length - remainingLogs.length;

  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(remainingLogs, null, 2));
  } catch (err) {
    console.error('Failed to write logs.json', err);
    return res.status(500).json({ error: 'Failed to write logs' });
  }

  res.json({
    success: true,
    deleted: deletedCount,
  });
});




app.listen(PORT, () => {
  console.log(`✅ Logging Server running on port ${PORT}`);
});
