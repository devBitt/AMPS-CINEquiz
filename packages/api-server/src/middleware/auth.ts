import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getDb } from "../database/db.js";

const JWT_SECRET = process.env["JWT_SECRET"] || "cinequiz_super_secret_jwt_key_2024";

export interface AuthRequest extends Request {
  admin?: { adminId: string; role: string };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header", code: "UNAUTHORIZED" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string; role: string };
    
    // Check if the admin ID exists in the database
    const db = getDb();
    const adminExists = db.prepare("SELECT 1 FROM admins WHERE id = ?").get(decoded.adminId);
    if (!adminExists) {
      res.status(401).json({ error: "Admin session is stale. Please log in again.", code: "TOKEN_INVALID" });
      return;
    }

    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token", code: "TOKEN_INVALID" });
  }
}

export { JWT_SECRET };
