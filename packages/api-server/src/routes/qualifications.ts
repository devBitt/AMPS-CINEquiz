import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../database/db.js";
import { requireAdmin, type AuthRequest } from "../middleware/auth.js";

const qualificationsRouter = Router();

// GET /qualifications/:roundId
qualificationsRouter.get("/:roundId", requireAdmin, (req, res) => {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT 
        q.id,
        q.participant_id as participantId,
        p.roll_number as rollNumber,
        q.round_id as roundId,
        q.qualified,
        q.qualification_reason as qualificationReason,
        q.override_by_admin as overrideByAdmin,
        q.created_at as createdAt
      FROM qualifications q
      JOIN participants p ON p.id = q.participant_id
      WHERE q.round_id = ?
      ORDER BY q.qualified DESC, q.created_at ASC
    `)
    .all(req.params["roundId"]) as {
    id: string;
    participantId: string;
    rollNumber: string;
    roundId: string;
    qualified: number;
    qualificationReason: string | null;
    overrideByAdmin: number;
    createdAt: string;
  }[];

  res.json(
    rows.map((r) => ({
      id: r.id,
      participantId: r.participantId,
      rollNumber: r.rollNumber,
      roundId: r.roundId,
      qualified: Boolean(r.qualified),
      qualificationReason: r.qualificationReason,
      overrideByAdmin: Boolean(r.overrideByAdmin),
      createdAt: r.createdAt,
    }))
  );
});

// POST /qualifications/override
qualificationsRouter.post("/override", requireAdmin, (req: AuthRequest, res) => {
  const { participantId, roundId, qualified } = req.body as {
    participantId: string;
    roundId: string;
    qualified: boolean;
  };

  if (!participantId || !roundId || qualified === undefined) {
    res.status(400).json({ error: "participantId, roundId and qualified required", code: "MISSING_FIELDS" });
    return;
  }

  const db = getDb();

  // Upsert qualification
  const existing = db
    .prepare("SELECT id FROM qualifications WHERE participant_id = ? AND round_id = ?")
    .get(participantId, roundId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      "UPDATE qualifications SET qualified = ?, qualification_reason = 'manual_override', override_by_admin = 1 WHERE id = ?"
    ).run(qualified ? 1 : 0, existing.id);
  } else {
    db.prepare(
      "INSERT INTO qualifications (id, participant_id, round_id, qualified, qualification_reason, override_by_admin) VALUES (?, ?, ?, ?, 'manual_override', 1)"
    ).run(uuidv4(), participantId, roundId, qualified ? 1 : 0);
  }

  // Update participant status
  if (!qualified) {
    db.prepare("UPDATE participants SET current_status = 'eliminated' WHERE id = ?").run(participantId);
  } else {
    db.prepare("UPDATE participants SET current_status = 'active' WHERE id = ?").run(participantId);
  }

  if (req.admin) {
    db.prepare("INSERT INTO audit_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)").run(
      uuidv4(),
      req.admin.adminId,
      "qualification_override",
      JSON.stringify({ participantId, roundId, qualified })
    );
  }

  res.json({ success: true, message: "Override applied" });
});

export default qualificationsRouter;
