import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../database/db.js";
import { requireAdmin, type AuthRequest } from "../middleware/auth.js";

const adminRouter = Router();

// POST /admin/finalist-reveal
adminRouter.post("/finalist-reveal", requireAdmin, (req: AuthRequest, res) => {
  const { competitionId } = req.body as { competitionId: string };

  if (!competitionId) {
    res.status(400).json({ error: "competitionId required", code: "MISSING_FIELDS" });
    return;
  }

  const db = getDb();
  const finalists = db
    .prepare("SELECT id, roll_number FROM participants WHERE competition_id = ? AND current_status = 'finalist'")
    .all(competitionId) as { id: string; roll_number: string }[];

  const io = req.app.get("io");
  if (io) {
    const finalistData = finalists.map((f) => ({ id: f.id, rollNumber: f.roll_number }));
    io.to(`projector_${competitionId}`).emit("finalist_reveal", { finalists: finalistData });
    io.to(`comp_${competitionId}`).emit("finalist_reveal", { finalists: finalistData });
  }

  if (req.admin) {
    db.prepare("INSERT INTO audit_logs (id, admin_id, action, details) VALUES (?, ?, ?, ?)").run(
      uuidv4(),
      req.admin.adminId,
      "finalist_reveal_triggered",
      JSON.stringify({ competitionId, finalistCount: finalists.length })
    );
  }

  res.json({ success: true, message: "Finalist reveal triggered" });
});

// GET /admin/stats
adminRouter.get("/stats", requireAdmin, (req, res) => {
  const db = getDb();
  const { competitionId } = req.query as { competitionId?: string };

  let compId = competitionId;
  if (!compId) {
    const comp = db
      .prepare("SELECT id FROM competitions ORDER BY created_at DESC LIMIT 1")
      .get() as { id: string } | undefined;
    if (!comp) {
      res.json({ totalParticipants: 0, roundStats: [], finalists: [] });
      return;
    }
    compId = comp.id;
  }

  const totalParticipants = (
    db.prepare("SELECT COUNT(*) as count FROM participants WHERE competition_id = ?").get(compId) as { count: number }
  ).count;

  const rounds = db
    .prepare("SELECT id, round_number FROM rounds WHERE competition_id = ? ORDER BY round_number")
    .all(compId) as { id: string; round_number: number }[];

  const roundStats = rounds.map((r) => {
    const totalSubmissions = (
      db.prepare("SELECT COUNT(*) as count FROM submissions WHERE round_id = ?").get(r.id) as { count: number }
    ).count;

    const correctSubmissions = (
      db.prepare("SELECT COUNT(*) as count FROM submissions WHERE round_id = ? AND is_correct = 1").get(r.id) as {
        count: number;
      }
    ).count;

    const qualifiedCount = (
      db.prepare("SELECT COUNT(*) as count FROM qualifications WHERE round_id = ? AND qualified = 1").get(r.id) as {
        count: number;
      }
    ).count;

    const eliminatedCount = (
      db.prepare("SELECT COUNT(*) as count FROM qualifications WHERE round_id = ? AND qualified = 0").get(r.id) as {
        count: number;
      }
    ).count;

    const avgResponseTime = db
      .prepare("SELECT AVG(response_time_ms) as avg FROM submissions WHERE round_id = ? AND is_correct = 1")
      .get(r.id) as { avg: number | null };

    return {
      roundNumber: r.round_number,
      totalSubmissions,
      correctSubmissions,
      qualifiedCount,
      eliminatedCount,
      avgResponseTimeMs: avgResponseTime.avg ? Math.round(avgResponseTime.avg) : null,
    };
  });

  const finalists = db
    .prepare("SELECT id, roll_number as rollNumber FROM participants WHERE competition_id = ? AND current_status = 'finalist'")
    .all(compId) as { id: string; rollNumber: string }[];

  res.json({ totalParticipants, roundStats, finalists });
});

// GET /admin/audit-logs
adminRouter.get("/audit-logs", requireAdmin, (req, res) => {
  const db = getDb();
  const { limit } = req.query as { limit?: string };
  const limitNum = Math.min(parseInt(limit ?? "100", 10) || 100, 500);

  const logs = db
    .prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?")
    .all(limitNum) as {
    id: string;
    admin_id: string;
    action: string;
    details: string | null;
    created_at: string;
  }[];

  res.json(
    logs.map((l) => ({
      id: l.id,
      adminId: l.admin_id,
      action: l.action,
      details: l.details,
      createdAt: l.created_at,
    }))
  );
});

export default adminRouter;
