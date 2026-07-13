import { Router } from "express";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../database/db.js";
import { requireAdmin } from "../middleware/auth.js";

const participantsRouter = Router();

const registerLimiter = rateLimit({ windowMs: 60 * 1000, max: 1000 });

// POST /participants/register
participantsRouter.post("/register", registerLimiter, (req, res) => {
  const { rollNumber, competitionId } = req.body as {
    rollNumber: string;
    competitionId: string;
  };

  if (!rollNumber || !competitionId) {
    res.status(400).json({ error: "rollNumber and competitionId are required", code: "MISSING_FIELDS" });
    return;
  }

  // Validate roll number format
  if (!/^[a-zA-Z0-9-]{3,20}$/.test(rollNumber)) {
    res.status(400).json({
      error: "Roll number must be 3-20 characters, alphanumeric and hyphens only",
      code: "INVALID_ROLL_NUMBER",
    });
    return;
  }

  const db = getDb();

  // Check competition exists and is in waiting state
  const competition = db.prepare("SELECT * FROM competitions WHERE id = ?").get(competitionId) as
    | { id: string; status: string }
    | undefined;

  if (!competition) {
    res.status(404).json({ error: "Competition not found", code: "COMPETITION_NOT_FOUND" });
    return;
  }

  if (competition.status !== "waiting") {
    res.status(400).json({
      error: "Competition is not accepting registrations",
      code: "COMPETITION_NOT_OPEN",
    });
    return;
  }

  // Check duplicate
  const existing = db
    .prepare("SELECT id FROM participants WHERE competition_id = ? AND roll_number = ?")
    .get(competitionId, rollNumber);

  if (existing) {
    res.status(409).json({ error: "Roll number already registered", code: "DUPLICATE_ROLL_NUMBER" });
    return;
  }

  const participantId = uuidv4();
  const sessionToken = uuidv4();

  db.prepare(
    "INSERT INTO participants (id, competition_id, roll_number, session_token, current_status) VALUES (?, ?, ?, ?, 'active')"
  ).run(participantId, competitionId, rollNumber, sessionToken);

  // Notify via socket (io is set on app)
  const io = req.app.get("io");
  if (io) {
    const count = (
      db
        .prepare("SELECT COUNT(*) as count FROM participants WHERE competition_id = ?")
        .get(competitionId) as { count: number }
    ).count;
    io.to(`comp_${competitionId}`).emit("participant_count", count);
    io.to(`projector_${competitionId}`).emit("participant_count", count);
    io.to(`admin_${competitionId}`).emit("participant_count", count);
  }

  res.status(201).json({
    participantId,
    sessionToken,
    competitionId,
    rollNumber,
  });
});

// GET /participants (admin only)
participantsRouter.get("/", requireAdmin, (req, res) => {
  const db = getDb();
  const { competitionId, search } = req.query as { competitionId?: string; search?: string };

  let query = `
    SELECT 
      p.id,
      p.roll_number as rollNumber,
      p.registered_at as registeredAt,
      p.current_status as currentStatus,
      q1.qualified as round1Qualified,
      q2.qualified as round2Qualified,
      q3.qualified as round3Qualified,
      q4.qualified as round4Qualified,
      q5.qualified as round5Qualified
    FROM participants p
    LEFT JOIN rounds r1 ON r1.competition_id = p.competition_id AND r1.round_number = 1
    LEFT JOIN rounds r2 ON r2.competition_id = p.competition_id AND r2.round_number = 2
    LEFT JOIN rounds r3 ON r3.competition_id = p.competition_id AND r3.round_number = 3
    LEFT JOIN rounds r4 ON r4.competition_id = p.competition_id AND r4.round_number = 4
    LEFT JOIN rounds r5 ON r5.competition_id = p.competition_id AND r5.round_number = 5
    LEFT JOIN qualifications q1 ON q1.participant_id = p.id AND q1.round_id = r1.id
    LEFT JOIN qualifications q2 ON q2.participant_id = p.id AND q2.round_id = r2.id
    LEFT JOIN qualifications q3 ON q3.participant_id = p.id AND q3.round_id = r3.id
    LEFT JOIN qualifications q4 ON q4.participant_id = p.id AND q4.round_id = r4.id
    LEFT JOIN qualifications q5 ON q5.participant_id = p.id AND q5.round_id = r5.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (competitionId) {
    query += " AND p.competition_id = ?";
    params.push(competitionId);
  }
  if (search) {
    query += " AND p.roll_number LIKE ?";
    params.push(`%${search}%`);
  }

  query += " ORDER BY p.registered_at DESC";

  const rows = db.prepare(query).all(...params) as {
    id: string;
    rollNumber: string;
    registeredAt: string;
    currentStatus: string;
    round1Qualified: number | null;
    round2Qualified: number | null;
    round3Qualified: number | null;
    round4Qualified: number | null;
    round5Qualified: number | null;
  }[];

  const result = rows.map((r) => ({
    id: r.id,
    rollNumber: r.rollNumber,
    registeredAt: r.registeredAt,
    currentStatus: r.currentStatus,
    round1Status: r.round1Qualified === null ? null : r.round1Qualified ? "qualified" : "eliminated",
    round2Status: r.round2Qualified === null ? null : r.round2Qualified ? "qualified" : "eliminated",
    round3Status: r.round3Qualified === null ? null : r.round3Qualified ? "qualified" : "eliminated",
    round4Status: r.round4Qualified === null ? null : r.round4Qualified ? "qualified" : "eliminated",
    round5Status: r.round5Qualified === null ? null : r.round5Qualified ? "qualified" : "eliminated",
  }));

  res.json(result);
});

export default participantsRouter;
