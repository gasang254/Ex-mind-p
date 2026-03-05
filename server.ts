import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("exmind.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    profile_picture TEXT,
    preferences TEXT -- JSON string for AI tone, gender, language
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    volunteer_id INTEGER,
    type TEXT, -- 'chat', 'voice', 'video'
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
    scheduled_at DATETIME,
    notes TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
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

  CREATE TABLE IF NOT EXISTS support_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    relation TEXT,
    phone TEXT,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS volunteer_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    status TEXT DEFAULT 'pending', -- pending, contacted, resolved
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    activity TEXT,
    time TEXT,
    completed INTEGER DEFAULT 0
  );
`);

// Migration: Add profile_picture column if it doesn't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
  const hasProfilePicture = tableInfo.some(col => col.name === 'profile_picture');
  if (!hasProfilePicture) {
    db.exec("ALTER TABLE users ADD COLUMN profile_picture TEXT");
    console.log("Migration: Added profile_picture column to users table");
  }
  const hasPassword = tableInfo.some(col => col.name === 'password');
  if (!hasPassword) {
    db.exec("ALTER TABLE users ADD COLUMN password TEXT");
    console.log("Migration: Added password column to users table");
  }
} catch (e) {
  console.error("Migration error:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)");
      const result = stmt.run(email, hashedPassword, name);
      res.json({ success: true, user_id: result.lastInsertRowid });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
    const user = stmt.get(email) as any;

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
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

  // Support Contacts
  app.get("/api/support/:user_id", (req, res) => {
    const stmt = db.prepare("SELECT * FROM support_contacts WHERE user_id = ?");
    const contacts = stmt.all(req.params.user_id);
    res.json(contacts);
  });

  app.post("/api/support", (req, res) => {
    const { user_id, name, relation, phone, email } = req.body;
    const stmt = db.prepare("INSERT INTO support_contacts (user_id, name, relation, phone, email) VALUES (?, ?, ?, ?, ?)");
    stmt.run(user_id || 1, name, relation, phone, email);
    res.json({ success: true });
  });

  app.delete("/api/support/:id", (req, res) => {
    const stmt = db.prepare("DELETE FROM support_contacts WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ success: true });
  });

  // Volunteer Requests
  app.post("/api/volunteer-request", (req, res) => {
    const { user_id } = req.body;
    const stmt = db.prepare("INSERT INTO volunteer_requests (user_id) VALUES (?)");
    stmt.run(user_id || 1);
    res.json({ success: true });
  });

  // Reminders
  app.get("/api/reminders/:user_id", (req, res) => {
    const stmt = db.prepare("SELECT * FROM reminders WHERE user_id = ? ORDER BY time ASC");
    const reminders = stmt.all(req.params.user_id);
    res.json(reminders);
  });

  app.post("/api/reminders", (req, res) => {
    const { user_id, activity, time } = req.body;
    const stmt = db.prepare("INSERT INTO reminders (user_id, activity, time) VALUES (?, ?, ?)");
    stmt.run(user_id || 1, activity, time);
    res.json({ success: true });
  });

  app.delete("/api/reminders/:id", (req, res) => {
    const stmt = db.prepare("DELETE FROM reminders WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/reminders/:id", (req, res) => {
    const { completed } = req.body;
    const stmt = db.prepare("UPDATE reminders SET completed = ? WHERE id = ?");
    stmt.run(completed ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  // Sessions
  app.get("/api/sessions/:user_id", (req, res) => {
    const stmt = db.prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY scheduled_at ASC");
    const sessions = stmt.all(req.params.user_id);
    res.json(sessions);
  });

  app.post("/api/sessions", (req, res) => {
    const { user_id, type, scheduled_at, notes } = req.body;
    const stmt = db.prepare("INSERT INTO sessions (user_id, type, scheduled_at, notes) VALUES (?, ?, ?, ?)");
    stmt.run(user_id || 1, type, scheduled_at, notes);
    res.json({ success: true });
  });

  app.delete("/api/sessions/:id", (req, res) => {
    const stmt = db.prepare("DELETE FROM sessions WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ success: true });
  });

  // User Profile
  app.get("/api/user/:user_id", (req, res) => {
    const stmt = db.prepare("SELECT id, email, name, profile_picture FROM users WHERE id = ?");
    const user = stmt.get(req.params.user_id);
    if (user) {
      res.json(user);
    } else {
      res.json({ id: req.params.user_id, name: "User", email: "", profile_picture: null });
    }
  });

  app.post("/api/user", (req, res) => {
    const { user_id, name, email, profile_picture } = req.body;
    const userId = user_id || 1;

    const checkUser = db.prepare("SELECT id FROM users WHERE id = ?");
    const user = checkUser.get(userId);

    if (user) {
      const stmt = db.prepare("UPDATE users SET name = ?, email = ?, profile_picture = ? WHERE id = ?");
      stmt.run(name, email, profile_picture, userId);
    } else {
      const stmt = db.prepare("INSERT INTO users (id, name, email, profile_picture) VALUES (?, ?, ?, ?)");
      stmt.run(userId, name, email, profile_picture);
    }
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
        backstory: '',
        isSpeakingEnabled: true
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
