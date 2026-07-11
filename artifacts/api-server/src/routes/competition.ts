import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../database/db.js";
import { requireAdmin, type AuthRequest } from "../middleware/auth.js";
import { clearTimer } from "../services/timerService.js";

const competitionRouter = Router();

function buildCompetitionDetail(competitionId: string) {
  const db = getDb();
  const comp = db.prepare("SELECT * FROM competitions WHERE id = ?").get(competitionId) as {
    id: string;
    name: string;
    status: string;
    current_round: number;
    created_at: string;
  } | undefined;

  if (!comp) return null;

  const rounds = db
    .prepare("SELECT id, round_number, emoji_clue, time_limit_seconds, status, started_at, ended_at FROM rounds WHERE competition_id = ? ORDER BY round_number")
    .all(competitionId) as {
    id: string;
    round_number: number;
    emoji_clue: string;
    time_limit_seconds: number;
    status: string;
    started_at: string | null;
    ended_at: string | null;
  }[];

  const count = (
    db.prepare("SELECT COUNT(*) as count FROM participants WHERE competition_id = ?").get(competitionId) as {
      count: number;
    }
  ).count;

  return {
    id: comp.id,
    name: comp.name,
    status: comp.status,
    currentRound: comp.current_round,
    createdAt: comp.created_at,
    participantCount: count,
    rounds: rounds.map((r) => ({
      id: r.id,
      roundNumber: r.round_number,
      emojiClue: r.emoji_clue,
      timeLimitSeconds: r.time_limit_seconds,
      status: r.status,
      startedAt: r.started_at,
      endedAt: r.ended_at,
    })),
  };
}

// GET /competition
competitionRouter.get("/", (req, res) => {
  const db = getDb();
  const comp = db
    .prepare("SELECT id FROM competitions WHERE status != 'completed' ORDER BY created_at DESC LIMIT 1")
    .get() as { id: string } | undefined;

  if (!comp) {
    res.status(404).json({ error: "No active competition", code: "NOT_FOUND" });
    return;
  }

  const detail = buildCompetitionDetail(comp.id);
  if (!detail) {
    res.status(404).json({ error: "Competition not found", code: "NOT_FOUND" });
    return;
  }

  res.json(detail);
});

// POST /competition (admin)
competitionRouter.post("/", requireAdmin, (req: AuthRequest, res) => {
  const { name, rounds } = req.body as {
    name: string;
    rounds?: Array<{
      roundNumber: number;
      emojiClue: string;
      correctAnswers: string[];
      timeLimitSeconds: number;
    }>;
  };

  if (!name) {
    res.status(400).json({ error: "Competition name required", code: "MISSING_FIELDS" });
    return;
  }

  const db = getDb();
  const compId = uuidv4();

  db.prepare("INSERT INTO competitions (id, name, status, current_round) VALUES (?, ?, 'waiting', 0)").run(
    compId,
    name
  );

  // Insert rounds if provided
  if (rounds && Array.isArray(rounds)) {
    const insertRound = db.prepare(
      "INSERT INTO rounds (id, competition_id, round_number, emoji_clue, correct_answers, time_limit_seconds, status, random_seed) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)"
    );
    for (const r of rounds) {
      insertRound.run(
        uuidv4(),
        compId,
        r.roundNumber,
        r.emojiClue,
        JSON.stringify(r.correctAnswers),
        r.timeLimitSeconds,
        Math.random().toString()
      );
    }
  }

  // Audit log
  if (req.admin) {
    db.prepare("INSERT INTO audit_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)").run(
      uuidv4(),
      req.admin.adminId,
      "competition_created",
      JSON.stringify({ name, compId })
    );
  }

  res.status(201).json(buildCompetitionDetail(compId));
});

// PATCH /competition/:id (admin)
competitionRouter.patch("/:id", requireAdmin, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, status } = req.body as { name?: string; status?: string };

  const db = getDb();
  const comp = db.prepare("SELECT id FROM competitions WHERE id = ?").get(id);
  if (!comp) {
    res.status(404).json({ error: "Competition not found", code: "NOT_FOUND" });
    return;
  }

  if (name) db.prepare("UPDATE competitions SET name = ? WHERE id = ?").run(name, id);
  if (status) db.prepare("UPDATE competitions SET status = ? WHERE id = ?").run(status, id);

  res.json(buildCompetitionDetail(id as string));
});

// POST /competition/:id/emergency-stop (admin)
competitionRouter.post("/:id/emergency-stop", requireAdmin, (req: AuthRequest, res) => {
  const { id } = req.params;
  const db = getDb();

  const comp = db.prepare("SELECT * FROM competitions WHERE id = ?").get(id) as
    | { id: string; status: string; current_round: number }
    | undefined;

  if (!comp) {
    res.status(404).json({ error: "Competition not found", code: "NOT_FOUND" });
    return;
  }

  // Clear all active timers for this competition's rounds
  const activeRound = db
    .prepare("SELECT id FROM rounds WHERE competition_id = ? AND status = 'active'")
    .get(id) as { id: string } | undefined;

  if (activeRound) {
    clearTimer(activeRound.id);
    db.prepare("UPDATE rounds SET status = 'completed', ended_at = datetime('now') WHERE id = ?").run(
      activeRound.id
    );
  }

  db.prepare("UPDATE competitions SET status = 'completed' WHERE id = ?").run(id);

  if (req.admin) {
    db.prepare("INSERT INTO audit_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)").run(
      uuidv4(),
      req.admin.adminId,
      "emergency_stop",
      JSON.stringify({ competitionId: id })
    );
  }

  const io = req.app.get("io");
  if (io) {
    io.to(`comp_${id}`).emit("competition_ended", { reason: "emergency_stop" });
  }

  res.json({ success: true, message: "Competition stopped" });
});

export { buildCompetitionDetail };
export default competitionRouter;
