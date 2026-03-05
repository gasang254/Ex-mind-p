import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

declare global {
  namespace Express {
    interface Request {
      user?: admin.auth.DecodedIdToken;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized");
  } catch (e) {
    console.error("Error initializing Firebase Admin:", e);
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT_JSON not found. Auth verification will be disabled.");
}

const db = new Database("exmind.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    profile_picture TEXT,
    preferences TEXT -- JSON string for AI tone, gender, language
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    volunteer_id INTEGER,
    type TEXT, -- 'chat', 'voice', 'video'
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
    scheduled_at DATETIME,
    notes TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mood_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    mood INTEGER, -- 1-5
    note TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    content TEXT,
    sentiment TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    role TEXT, -- 'user' or 'model'
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS support_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    name TEXT,
    relation TEXT,
    phone TEXT,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS volunteer_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    status TEXT DEFAULT 'pending', -- pending, contacted, resolved
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
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

// Middleware to verify Firebase ID Token
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    if (admin.apps.length > 0) {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } else {
      // Fallback for development if Firebase Admin is not initialized
      console.warn("Firebase Admin not initialized. Skipping token verification.");
      next();
    }
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Sync User Profile (called after Firebase login/signup)
  app.post("/api/auth/sync", async (req, res) => {
    const { uid, email, name, profile_picture } = req.body;
    try {
      const checkUser = db.prepare("SELECT id FROM users WHERE id = ?");
      const user = checkUser.get(uid);

      if (user) {
        const stmt = db.prepare("UPDATE users SET name = ?, email = ?, profile_picture = ? WHERE id = ?");
        stmt.run(name, email, profile_picture, uid);
      } else {
        const stmt = db.prepare("INSERT INTO users (id, name, email, profile_picture) VALUES (?, ?, ?, ?)");
        stmt.run(uid, name, email, profile_picture);
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error syncing user:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mood Logs
  app.post("/api/mood", authenticate, (req, res) => {
    const { mood, note } = req.body;
    const user_id = req.user?.uid || req.body.user_id;
    const stmt = db.prepare("INSERT INTO mood_logs (user_id, mood, note) VALUES (?, ?, ?)");
    stmt.run(user_id, mood, note);
    res.json({ success: true });
  });

  app.get("/api/mood/:user_id", authenticate, (req, res) => {
    const user_id = req.user?.uid || req.params.user_id;
    const stmt = db.prepare("SELECT * FROM mood_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 30");
    const logs = stmt.all(user_id);
    res.json(logs);
  });

  // Journal
  app.post("/api/journal", authenticate, (req, res) => {
    const { content, sentiment } = req.body;
    const user_id = req.user?.uid || req.body.user_id;
    const stmt = db.prepare("INSERT INTO journal_entries (user_id, content, sentiment) VALUES (?, ?, ?)");
    stmt.run(user_id, content, sentiment);
    res.json({ success: true });
  });

  app.get("/api/journal/:user_id", authenticate, (req, res) => {
    const user_id = req.user?.uid || req.params.user_id;
    const stmt = db.prepare("SELECT * FROM journal_entries WHERE user_id = ? ORDER BY timestamp DESC");
    const entries = stmt.all(user_id);
    res.json(entries);
  });

  // Chat History
  app.get("/api/chat/:user_id", authenticate, (req, res) => {
    const user_id = req.user?.uid || req.params.user_id;
    const stmt = db.prepare("SELECT role, content FROM chat_history WHERE user_id = ? ORDER BY timestamp ASC");
    const history = stmt.all(user_id);
    res.json(history);
  });

  app.post("/api/chat", authenticate, (req, res) => {
    const { role, content } = req.body;
    const user_id = req.user?.uid || req.body.user_id;
    const stmt = db.prepare("INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)");
    stmt.run(user_id, role, content);
    res.json({ success: true });
  });

  // Support Contacts
  app.get("/api/support/:user_id", authenticate, (req, res) => {
    const user_id = req.user?.uid || req.params.user_id;
    const stmt = db.prepare("SELECT * FROM support_contacts WHERE user_id = ?");
    const contacts = stmt.all(user_id);
    res.json(contacts);
  });

  app.post("/api/support", authenticate, (req, res) => {
    const { name, relation, phone, email } = req.body;
    const user_id = req.user?.uid || req.body.user_id;
    const stmt = db.prepare("INSERT INTO support_contacts (user_id, name, relation, phone, email) VALUES (?, ?, ?, ?, ?)");
    stmt.run(user_id, name, relation, phone, email);
    res.json({ success: true });
  });

  app.delete("/api/support/:id", authenticate, (req, res) => {
    const stmt = db.prepare("DELETE FROM support_contacts WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ success: true });
  });

  // Volunteer Requests
  app.post("/api/volunteer-request", authenticate, (req, res) => {
    const user_id = req.user?.uid || req.body.user_id;
    const stmt = db.prepare("INSERT INTO volunteer_requests (user_id) VALUES (?)");
    stmt.run(user_id);
    res.json({ success: true });
  });

  // Reminders
  app.get("/api/reminders/:user_id", authenticate, (req, res) => {
    const user_id = req.user?.uid || req.params.user_id;
    const stmt = db.prepare("SELECT * FROM reminders WHERE user_id = ? ORDER BY time ASC");
    const reminders = stmt.all(user_id);
    res.json(reminders);
  });

  app.post("/api/reminders", authenticate, (req, res) => {
    const { activity, time } = req.body;
    const user_id = req.user?.uid || req.body.user_id;
    const stmt = db.prepare("INSERT INTO reminders (user_id, activity, time) VALUES (?, ?, ?)");
    stmt.run(user_id, activity, time);
    res.json({ success: true });
  });

  app.delete("/api/reminders/:id", authenticate, (req, res) => {
    const stmt = db.prepare("DELETE FROM reminders WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/reminders/:id", authenticate, (req, res) => {
    const { completed } = req.body;
    const stmt = db.prepare("UPDATE reminders SET completed = ? WHERE id = ?");
    stmt.run(completed ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  // Sessions
  app.get("/api/sessions/:user_id", authenticate, (req, res) => {
    const user_id = req.user?.uid || req.params.user_id;
    const stmt = db.prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY scheduled_at ASC");
    const sessions = stmt.all(user_id);
    res.json(sessions);
  });

  app.post("/api/sessions", authenticate, (req, res) => {
    const { type, scheduled_at, notes } = req.body;
    const user_id = req.user?.uid || req.body.user_id;
    const stmt = db.prepare("INSERT INTO sessions (user_id, type, scheduled_at, notes) VALUES (?, ?, ?, ?)");
    stmt.run(user_id, type, scheduled_at, notes);
    res.json({ success: true });
  });

  app.delete("/api/sessions/:id", authenticate, (req, res) => {
    const stmt = db.prepare("DELETE FROM sessions WHERE id = ?");
    stmt.run(req.params.id);
    res.json({ success: true });
  });

  // User Profile
  app.get("/api/user/:user_id", authenticate, (req, res) => {
    const user_id = req.user?.uid || req.params.user_id;
    const stmt = db.prepare("SELECT id, email, name, profile_picture FROM users WHERE id = ?");
    const user = stmt.get(user_id);
    if (user) {
      res.json(user);
    } else {
      res.json({ id: user_id, name: "User", email: "", profile_picture: null });
    }
  });

  app.post("/api/user", authenticate, (req, res) => {
    const { name, email, profile_picture } = req.body;
    const user_id = req.user?.uid || req.body.user_id;

    const checkUser = db.prepare("SELECT id FROM users WHERE id = ?");
    const user = checkUser.get(user_id);

    if (user) {
      const stmt = db.prepare("UPDATE users SET name = ?, email = ?, profile_picture = ? WHERE id = ?");
      stmt.run(name, email, profile_picture, user_id);
    } else {
      const stmt = db.prepare("INSERT INTO users (id, name, email, profile_picture) VALUES (?, ?, ?, ?)");
      stmt.run(user_id, name, email, profile_picture);
    }
    res.json({ success: true });
  });

  // User Preferences
  app.get("/api/preferences/:user_id", authenticate, (req, res) => {
    const user_id = req.user?.uid || req.params.user_id;
    const stmt = db.prepare("SELECT preferences FROM users WHERE id = ?");
    const user = stmt.get(user_id);
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

  app.post("/api/preferences", authenticate, (req, res) => {
    const { preferences } = req.body;
    const user_id = req.user?.uid || req.body.user_id;
    
    // Check if user exists
    const checkUser = db.prepare("SELECT id FROM users WHERE id = ?");
    const user = checkUser.get(user_id);
    
    if (user) {
      const stmt = db.prepare("UPDATE users SET preferences = ? WHERE id = ?");
      stmt.run(JSON.stringify(preferences), user_id);
    } else {
      const stmt = db.prepare("INSERT INTO users (id, preferences) VALUES (?, ?)");
      stmt.run(user_id, JSON.stringify(preferences));
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
