import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("exmind.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    preferences TEXT -- JSON string for AI tone, gender, language
  );

  CREATE TABLE IF NOT EXISTS mood_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    mood INTEGER, -- 1-5
    note TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT,
    sentiment TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT, -- 'user' or 'model'
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Mood Logs
  app.post("/api/mood", (req, res) => {
    const { user_id, mood, note } = req.body;
    const stmt = db.prepare("INSERT INTO mood_logs (user_id, mood, note) VALUES (?, ?, ?)");
    stmt.run(user_id || 1, mood, note);
    res.json({ success: true });
  });

  app.get("/api/mood/:user_id", (req, res) => {
    const stmt = db.prepare("SELECT * FROM mood_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 30");
    const logs = stmt.all(req.params.user_id);
    res.json(logs);
  });

  // Journal
  app.post("/api/journal", (req, res) => {
    const { user_id, content, sentiment } = req.body;
    const stmt = db.prepare("INSERT INTO journal_entries (user_id, content, sentiment) VALUES (?, ?, ?)");
    stmt.run(user_id || 1, content, sentiment);
    res.json({ success: true });
  });

  app.get("/api/journal/:user_id", (req, res) => {
    const stmt = db.prepare("SELECT * FROM journal_entries WHERE user_id = ? ORDER BY timestamp DESC");
    const entries = stmt.all(req.params.user_id);
    res.json(entries);
  });

  // Chat History
  app.get("/api/chat/:user_id", (req, res) => {
    const stmt = db.prepare("SELECT role, content FROM chat_history WHERE user_id = ? ORDER BY timestamp ASC");
    const history = stmt.all(req.params.user_id);
    res.json(history);
  });

  app.post("/api/chat", (req, res) => {
    const { user_id, role, content } = req.body;
    const stmt = db.prepare("INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)");
    stmt.run(user_id || 1, role, content);
    res.json({ success: true });
  });

  // User Preferences
  app.get("/api/preferences/:user_id", (req, res) => {
    const stmt = db.prepare("SELECT preferences FROM users WHERE id = ?");
    const user = stmt.get(req.params.user_id);
    if (user && user.preferences) {
      res.json(JSON.parse(user.preferences));
    } else {
      // Default preferences
      res.json({
        voice: 'Kore',
        language: 'en',
        tone: 'empathetic',
        backstory: ''
      });
    }
  });

  app.post("/api/preferences", (req, res) => {
    const { user_id, preferences } = req.body;
    const userId = user_id || 1;
    
    // Check if user exists
    const checkUser = db.prepare("SELECT id FROM users WHERE id = ?");
    const user = checkUser.get(userId);
    
    if (user) {
      const stmt = db.prepare("UPDATE users SET preferences = ? WHERE id = ?");
      stmt.run(JSON.stringify(preferences), userId);
    } else {
      const stmt = db.prepare("INSERT INTO users (id, preferences) VALUES (?, ?)");
      stmt.run(userId, JSON.stringify(preferences));
    }
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
