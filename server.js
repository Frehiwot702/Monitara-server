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

const db = require("./firebase");

// Ensure logs.json exists
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '[]');
  console.log('✅ Created logs.json');
}

// Middleware
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'x-project-code', 'x-api-key'],
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

// GET /logs
app.get("/logs", async (req, res) => {
  try {
    const projectCode =
      req.headers["x-project-code"] ||
      req.query.code;

    let query = db.collection("logs");

    // Filter only if a code was provided
    if (projectCode) {
      query = query.where("code", "==", projectCode);
    }

    query = query.orderBy("createdAt", "desc");

    const snapshot = await query.get();

    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(logs);
  } catch (err) {
    console.error("GET LOGS ERROR:", err);

    res.status(500).json({
      error: "Failed to fetch logs",
    });
  }
});

app.get("/firebase-test", async (req, res) => {
  await db.collection("test").add({
    message: "Firebase is working",
    time: new Date().toISOString()
  });

  res.json({ success: true });
});

app.get('/debug-write', (req, res) => {
  const test = { time: Date.now() };

  const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
  logs.push(test);

  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));

  res.json({
    written: test,
    total: logs.length
  });
});

// POST /log
app.post("/log", async (req, res) => {
  try {
    const newLog = {
      ...req.body,
      code: req.projectCode,
      timestamp: new Date().toISOString(),
    };

    const docRef = await db.collection("logs").add(newLog);

    res.json({
      success: true,
      id: docRef.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save log" });
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
