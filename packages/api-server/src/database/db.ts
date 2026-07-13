import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "node:url";
import { logger } from "../lib/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, "..", "cinequiz.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

let db: DB = null;

export function getDb(): DB {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    initSchema();
    seedIfEmpty();
  }
  return db;
}

function initSchema() {
  try {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, "utf-8");
    db.exec(schemaSql);
    logger.info("Database schema initialized from schema.sql");
  } catch (err) {
    logger.error({ err }, "Error initializing database schema from schema.sql");
    throw err;
  }
}


function seedIfEmpty() {
  const row = db.prepare("SELECT COUNT(*) as count FROM admins").get() as { count: number };
  if (row.count > 0) return;

  logger.info("Seeding database with initial data...");

  const adminId = "admin_default";
  const adminPassword = process.env.ADMIN_PASSWORD || "cinequiz2024";
  const passwordHash = bcrypt.hashSync(adminPassword, 10);
  db.prepare("INSERT INTO admins (id, username, password_hash) VALUES (?, ?, ?)").run(
    adminId, "admin", passwordHash
  );

  const compId = "comp_default";
  db.prepare("INSERT INTO competitions (id, name, status, current_round) VALUES (?, ?, ?, ?)").run(
    compId, "CineQuiz Fest 2024", "waiting", 0
  );

  const rounds = [
    { number: 1, emoji: JSON.stringify(["https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=1000&q=80", "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?w=1000&q=80"]), answers: ["the lion king", "lion king"], time: 20 },
    { number: 2, emoji: JSON.stringify(["https://images.unsplash.com/photo-1635805737707-575885ab0820?w=1000&q=80", "https://images.unsplash.com/photo-1608889175123-8ec330b86f84?w=1000&q=80"]), answers: ["spider-man", "spiderman", "spider man"], time: 35 },
    { number: 3, emoji: JSON.stringify(["https://images.unsplash.com/photo-1483141994026-e440758241b2?w=1000&q=80", "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=1000&q=80"]), answers: ["frozen"], time: 40 },
    { number: 4, emoji: JSON.stringify(["https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&q=80", "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1000&q=80"]), answers: ["transformers"], time: 50 },
    { number: 5, emoji: JSON.stringify(["https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=1000&q=80", "https://images.unsplash.com/photo-1534375971785-5c18f593cf9a?w=1000&q=80"]), answers: ["the dark knight", "dark knight", "batman"], time: 60 },
  ];

  const insertRound = db.prepare(
    "INSERT INTO rounds (id, competition_id, round_number, emoji_clue, correct_answers, time_limit_seconds, status, random_seed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const r of rounds) {
    insertRound.run(uuidv4(), compId, r.number, r.emoji, JSON.stringify(r.answers), r.time, "pending", Math.random().toString());
  }

  logger.info("Database seeded: admin + sample competition ready");
}

// Initialize on import
getDb();
