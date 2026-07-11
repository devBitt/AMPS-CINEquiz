import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import rateLimit from "express-rate-limit";
import { getDb } from "../database/db.js";
import { JWT_SECRET } from "../middleware/auth.js";

const authRouter = Router();

const loginLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

authRouter.post("/login", loginLimiter, (req, res) => {
  const { username, password } = req.body as { username: string; password: string };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required", code: "MISSING_FIELDS" });
    return;
  }

  const db = getDb();
  const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get(username) as {
    id: string;
    username: string;
    password_hash: string;
  } | undefined;

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
    return;
  }

  const token = jwt.sign({ adminId: admin.id, role: "admin" }, JWT_SECRET, { expiresIn: "24h" });

  // Audit log
  db.prepare("INSERT INTO audit_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)").run(
    uuidv4(),
    admin.id,
    "admin_login",
    JSON.stringify({ username })
  );

  res.json({ token, adminId: admin.id, username: admin.username });
});

export default authRouter;
