import { Router } from "express";
import { getDb } from "../database/db.js";
import { requireAdmin } from "../middleware/auth.js";

const submissionsRouter = Router();

// GET /submissions/export
submissionsRouter.get("/export", requireAdmin, (req, res) => {
  const db = getDb();
  const { competitionId } = req.query as { competitionId?: string };

  let query = `
    SELECT 
      p.roll_number,
      r.round_number,
      s.answer,
      s.is_correct,
      s.response_time_ms,
      s.submitted_at,
      s.is_late,
      p.current_status
    FROM submissions s
    JOIN participants p ON p.id = s.participant_id
    JOIN rounds r ON r.id = s.round_id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (competitionId) {
    query += " AND p.competition_id = ?";
    params.push(competitionId);
  }

  query += " ORDER BY p.roll_number, r.round_number";

  const rows = db.prepare(query).all(...params) as {
    roll_number: string;
    round_number: number;
    answer: string;
    is_correct: number;
    response_time_ms: number;
    submitted_at: string;
    is_late: number;
    current_status: string;
  }[];

  // Generate CSV
  const csvLines = [
    "Roll Number,Round,Answer,Correct,Response Time (ms),Submitted At,Late,Status",
    ...rows.map(
      (r) =>
        `${r.roll_number},${r.round_number},"${r.answer.replace(/"/g, '""')}",${r.is_correct ? "Yes" : "No"},${r.response_time_ms},${r.submitted_at},${r.is_late ? "Yes" : "No"},${r.current_status}`
    ),
  ];

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=cinequiz-submissions.csv");
  res.send(csvLines.join("\n"));
});

export default submissionsRouter;
