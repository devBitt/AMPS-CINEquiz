import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../database/db.js";
import { requireAdmin, type AuthRequest } from "../middleware/auth.js";
import { startTimer, clearTimer, endRound } from "../services/timerService.js";

const roundsRouter = Router();

function formatRound(r: {
  id: string;
  competition_id: string;
  round_number: number;
  emoji_clue: string;
  correct_answers: string;
  time_limit_seconds: number;
  status: string;
  started_at: string | null;
  ended_at: string | null;
}) {
  return {
    id: r.id,
    competitionId: r.competition_id,
    roundNumber: r.round_number,
    emojiClue: r.emoji_clue,
    correctAnswers: JSON.parse(r.correct_answers) as string[],
    timeLimitSeconds: r.time_limit_seconds,
    status: r.status,
    startedAt: r.started_at,
    endedAt: r.ended_at,
  };
}

// POST /rounds (create/update round config)
roundsRouter.post("/", requireAdmin, (req: AuthRequest, res) => {
  const { competitionId, roundNumber, emojiClue, correctAnswers, timeLimitSeconds } = req.body as {
    competitionId: string;
    roundNumber: number;
    emojiClue: string;
    correctAnswers: string[];
    timeLimitSeconds: number;
  };

  if (!competitionId || !roundNumber || !emojiClue || !correctAnswers || !timeLimitSeconds) {
    res.status(400).json({ error: "All round fields required", code: "MISSING_FIELDS" });
    return;
  }

  const db = getDb();

  // Upsert round
  const existing = db
    .prepare("SELECT id FROM rounds WHERE competition_id = ? AND round_number = ?")
    .get(competitionId, roundNumber) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      "UPDATE rounds SET emoji_clue = ?, correct_answers = ?, time_limit_seconds = ? WHERE id = ?"
    ).run(emojiClue, JSON.stringify(correctAnswers), timeLimitSeconds, existing.id);

    const updated = db.prepare("SELECT * FROM rounds WHERE id = ?").get(existing.id) as Parameters<typeof formatRound>[0];
    res.status(201).json(formatRound(updated));
  } else {
    const roundId = uuidv4();
    db.prepare(
      "INSERT INTO rounds (id, competition_id, round_number, emoji_clue, correct_answers, time_limit_seconds, status, random_seed) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)"
    ).run(roundId, competitionId, roundNumber, emojiClue, JSON.stringify(correctAnswers), timeLimitSeconds, Math.random().toString());

    const created = db.prepare("SELECT * FROM rounds WHERE id = ?").get(roundId) as Parameters<typeof formatRound>[0];
    res.status(201).json(formatRound(created));
  }
});

// GET /rounds/:id
roundsRouter.get("/:id", requireAdmin, (req, res) => {
  const db = getDb();
  const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(req.params["id"]) as
    | Parameters<typeof formatRound>[0]
    | undefined;

  if (!round) {
    res.status(404).json({ error: "Round not found", code: "NOT_FOUND" });
    return;
  }

  res.json(formatRound(round));
});

// POST /rounds/:id/start
roundsRouter.post("/:id/start", requireAdmin, (req: AuthRequest, res) => {
  const db = getDb();
  const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(req.params["id"]) as
    | (Parameters<typeof formatRound>[0] & { competition_id: string })
    | undefined;

  if (!round) {
    res.status(404).json({ error: "Round not found", code: "NOT_FOUND" });
    return;
  }

  if (round.status !== "pending") {
    res.status(400).json({ error: "Round cannot be started", code: "ROUND_NOT_PENDING" });
    return;
  }

  db.prepare("UPDATE rounds SET status = 'active', started_at = datetime('now') WHERE id = ?").run(round.id);
  db.prepare("UPDATE competitions SET status = ? WHERE id = ?").run(
    `round_${round.round_number}`,
    round.competition_id
  );

  const io = req.app.get("io");
  if (io) {
    // Emit 3-2-1 then start
    const roundData = {
      id: round.id,
      roundNumber: round.round_number,
      emojiClue: round.emoji_clue,
      timeLimitSeconds: round.time_limit_seconds,
    };

    io.to(`comp_${round.competition_id}`).emit("round_starting", { round: roundData });
    io.to(`projector_${round.competition_id}`).emit("round_starting", { round: roundData });
    io.to(`admin_${round.competition_id}`).emit("round_starting", { round: roundData });

    // Start the round after a 3-second countdown window
    setTimeout(() => {
      io.to(`comp_${round.competition_id}`).emit("round_started", { round: roundData, serverTimestamp: Date.now() });
      io.to(`projector_${round.competition_id}`).emit("round_started", { round: roundData, serverTimestamp: Date.now() });
      io.to(`admin_${round.competition_id}`).emit("round_started", { round: roundData, serverTimestamp: Date.now() });
      startTimer(round.id, round.time_limit_seconds, round.competition_id, io);
    }, 3000);
  }

  if (req.admin) {
    db.prepare("INSERT INTO audit_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)").run(
      uuidv4(),
      req.admin.adminId,
      "round_started",
      JSON.stringify({ roundId: round.id, roundNumber: round.round_number })
    );
  }

  const updated = db.prepare("SELECT * FROM rounds WHERE id = ?").get(round.id) as Parameters<typeof formatRound>[0];
  res.json(formatRound(updated));
});

// POST /rounds/:id/end
roundsRouter.post("/:id/end", requireAdmin, async (req: AuthRequest, res) => {
  const db = getDb();
  const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(req.params["id"]) as
    | (Parameters<typeof formatRound>[0] & { competition_id: string })
    | undefined;

  if (!round) {
    res.status(404).json({ error: "Round not found", code: "NOT_FOUND" });
    return;
  }

  clearTimer(round.id);

  const io = req.app.get("io");
  if (io) {
    await endRound(round.id, round.competition_id, io);
  } else {
    db.prepare("UPDATE rounds SET status = 'completed', ended_at = datetime('now') WHERE id = ?").run(round.id);
  }

  if (req.admin) {
    db.prepare("INSERT INTO audit_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)").run(
      uuidv4(),
      req.admin.adminId,
      "round_ended_early",
      JSON.stringify({ roundId: round.id })
    );
  }

  const updated = db.prepare("SELECT * FROM rounds WHERE id = ?").get(round.id) as Parameters<typeof formatRound>[0];
  res.json(formatRound(updated));
});

export default roundsRouter;
