import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("freelance.db");
db.pragma('foreign_keys = ON');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client_name TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS project_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    section_type TEXT NOT NULL,
    content TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    section_type TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    task TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS hours_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    duration REAL NOT NULL,
    description TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use("/uploads", express.static(uploadDir));

  // API Routes
  app.get("/api/projects", (req, res) => {
    const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
    const projectsWithThumbnails = projects.map(p => {
      const firstImage = db.prepare("SELECT filename FROM project_files WHERE project_id = ? AND mime_type LIKE 'image/%' LIMIT 1").get(p.id);
      return { ...p, thumbnail: firstImage ? firstImage.filename : null };
    });
    res.json(projectsWithThumbnails);
  });

  app.post("/api/projects", (req, res) => {
    try {
      const { name, client_name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Project name is required" });
      }
      const info = db.prepare("INSERT INTO projects (name, client_name) VALUES (?, ?)").run(name, client_name);
      res.json({ id: Number(info.lastInsertRowid) });
    } catch (e) {
      console.error("Database error during project creation:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/projects/:id", (req, res) => {
    const { name, client_name, status } = req.body;
    const updates = [];
    const params = [];
    
    if (name !== undefined) { updates.push("name = ?"); params.push(name); }
    if (client_name !== undefined) { updates.push("client_name = ?"); params.push(client_name); }
    if (status !== undefined) { updates.push("status = ?"); params.push(status); }
    
    if (updates.length === 0) return res.status(400).json({ error: "No updates provided" });
    
    params.push(req.params.id);
    db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    res.json({ success: true });
  });

  app.delete("/api/projects/:id", (req, res) => {
    const projectId = req.params.id;
    console.log(`[DELETE] Attempting to delete project ID: ${projectId}`);
    
    try {
      // 1. Get files first
      const files = db.prepare("SELECT filename FROM project_files WHERE project_id = ?").all(projectId);
      console.log(`[DELETE] Found ${files.length} files to clean up`);
      
      // 2. Delete files from disk (don't let disk errors block DB deletion)
      files.forEach(file => {
        try {
          const filePath = path.join(uploadDir, file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[DELETE] Disk: Deleted ${file.filename}`);
          }
        } catch (fileErr) {
          console.error(`[DELETE] Disk Error: Could not delete ${file.filename}`, fileErr);
        }
      });

      // 3. Delete from database
      const result = db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
      console.log(`[DELETE] DB Result:`, result);
      
      if (result.changes === 0) {
        console.warn(`[DELETE] Warning: No project found with ID ${projectId}`);
        return res.status(404).json({ error: "Project not found in database" });
      }

      res.json({ success: true, changes: result.changes });
    } catch (error) {
      console.error("[DELETE] Fatal Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error during deletion" });
    }
  });

  app.get("/api/projects/:id", (req, res) => {
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    
    const sections = db.prepare("SELECT * FROM project_sections WHERE project_id = ?").all(req.params.id);
    const todos = db.prepare("SELECT * FROM todos WHERE project_id = ?").all(req.params.id);
    const hours = db.prepare("SELECT * FROM hours_log WHERE project_id = ?").all(req.params.id);
    const files = db.prepare("SELECT * FROM project_files WHERE project_id = ?").all(req.params.id);
    
    res.json({ ...project, sections, todos, hours, files });
  });

  app.patch("/api/projects/:id/section", (req, res) => {
    const { section_type, content } = req.body;
    const existing = db.prepare("SELECT id FROM project_sections WHERE project_id = ? AND section_type = ?")
      .get(req.params.id, section_type);
    
    if (existing) {
      db.prepare("UPDATE project_sections SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(content, existing.id);
    } else {
      db.prepare("INSERT INTO project_sections (project_id, section_type, content) VALUES (?, ?, ?)")
        .run(req.params.id, section_type, content);
    }
    res.json({ success: true });
  });

  app.post("/api/projects/:id/files", upload.single("file"), (req, res) => {
    const { section_type } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const info = db.prepare("INSERT INTO project_files (project_id, section_type, filename, original_name, mime_type) VALUES (?, ?, ?, ?, ?)")
      .run(req.params.id, section_type, req.file.filename, req.file.originalname, req.file.mimetype);
    
    res.json({ id: info.lastInsertRowid, filename: req.file.filename });
  });

  app.delete("/api/files/:id", (req, res) => {
    const file = db.prepare("SELECT filename FROM project_files WHERE id = ?").get(req.params.id);
    if (file) {
      const filePath = path.join(uploadDir, file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      db.prepare("DELETE FROM project_files WHERE id = ?").run(req.params.id);
    }
    res.json({ success: true });
  });

  app.post("/api/projects/:id/todos", (req, res) => {
    const { task } = req.body;
    const info = db.prepare("INSERT INTO todos (project_id, task) VALUES (?, ?)").run(req.params.id, task);
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/todos/:id", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE todos SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.post("/api/projects/:id/hours", (req, res) => {
    const { date, duration, description } = req.body;
    const info = db.prepare("INSERT INTO hours_log (project_id, date, duration, description) VALUES (?, ?, ?, ?)")
      .run(req.params.id, date, duration, description);
    res.json({ id: info.lastInsertRowid });
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
