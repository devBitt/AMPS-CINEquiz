import type { Server } from "socket.io";
import { getDb } from "../database/db.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger.js";

interface Submission {
  participant_id: string;
  is_correct: number;
  response_time_ms: number;
  server_received_at: string;
}

export async function computeQualifiers(roundId: string, competitionId: string, io: Server) {
  const db = getDb();

  const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(roundId) as {
    id: string;
    round_number: number;
    random_seed: string;
  } | undefined;

  if (!round) {
    logger.error({ roundId }, "Round not found for elimination");
    return;
  }

  const activeParticipants = db
    .prepare("SELECT id, roll_number FROM participants WHERE competition_id = ? AND current_status = 'active'")
    .all(competitionId) as { id: string; roll_number: string }[];

  const n = activeParticipants.length;
  if (n === 0) {
    logger.warn({ roundId }, "No active participants for elimination");
    return;
  }

  const submissions = db
    .prepare("SELECT participant_id, is_correct, response_time_ms, server_received_at FROM submissions WHERE round_id = ?")
    .all(roundId) as Submission[];

  const submissionMap = new Map<string, Submission>();
  for (const sub of submissions) {
    submissionMap.set(sub.participant_id, sub);
  }

  const participantScores = activeParticipants.map((p) => {
    const sub = submissionMap.get(p.id);
    if (sub) {
      return { participantId: p.id, rollNumber: p.roll_number, isCorrect: sub.is_correct, responseTimeMs: sub.response_time_ms, serverReceivedAt: sub.server_received_at };
    }
    return { participantId: p.id, rollNumber: p.roll_number, isCorrect: 0, responseTimeMs: 999_999_999, serverReceivedAt: "9999-12-31T23:59:59" };
  });

  participantScores.sort((a, b) => {
    if (b.isCorrect !== a.isCorrect) return b.isCorrect - a.isCorrect;
    if (a.responseTimeMs !== b.responseTimeMs) return a.responseTimeMs - b.responseTimeMs;
    if (a.serverReceivedAt < b.serverReceivedAt) return -1;
    if (a.serverReceivedAt > b.serverReceivedAt) return 1;
    return 0;
  });

  const correctCount = participantScores.filter(p => p.isCorrect === 1).length;

  // Determine how many should advance based on round number
  let targetCount: number;
  switch (round.round_number) {
    case 1:
      targetCount = Math.floor(n * 0.4);
      break;
    case 2:
      if (n <= 20) {
        targetCount = Math.floor(n * 0.6);
      } else if (n > 20 && n <= 30) {
        targetCount = Math.floor(n * 0.5);
      } else {
        targetCount = Math.floor(n * 0.4);
      }
      break;
    case 3:
      targetCount = Math.floor(n * 0.6);
      break;
    case 4:
      targetCount = Math.floor(n * 0.5);
      break;
    case 5:
      targetCount = 2;
      break;
    default:
      targetCount = Math.floor(n * 0.5);
  }

  // Never qualify more than who answered correctly — wrong answers always eliminate
  // Exception: if nobody got it right, keep the top 1 (to avoid a 0-advance deadlock)
  if (correctCount > 0) {
    targetCount = Math.min(targetCount, correctCount);
  } else {
    targetCount = Math.min(1, n); // keep 1 if everyone got it wrong
  }

  // Always advance at least 1 if there are participants, at most n
  targetCount = Math.max(1, Math.min(targetCount, n));

  const qualifiedIds = new Set(participantScores.slice(0, targetCount).map((p) => p.participantId));
  const eliminatedIds = new Set(participantScores.slice(targetCount).map((p) => p.participantId));
  const qualifiedRolls = participantScores.slice(0, targetCount).map((p) => p.rollNumber);
  const eliminatedRolls = participantScores.slice(targetCount).map((p) => p.rollNumber);

  // Use BEGIN/COMMIT for atomicity (node:sqlite doesn't have .transaction())
  db.exec("BEGIN");
  try {
    const insertQual = db.prepare(
      "INSERT OR REPLACE INTO qualifications (id, participant_id, round_id, qualified, qualification_reason) VALUES (?, ?, ?, ?, ?)"
    );
    for (const pId of qualifiedIds) {
      const sub = submissionMap.get(pId);
      const reason = sub?.is_correct ? "correct" : "correct_fastest";
      insertQual.run(uuidv4(), pId, roundId, 1, reason);
    }
    for (const pId of eliminatedIds) {
      const sub = submissionMap.get(pId);
      const reason = sub ? (sub.is_correct ? "eliminated_slow" : "wrong") : "no_submission";
      insertQual.run(uuidv4(), pId, roundId, 0, reason);
      db.prepare("UPDATE participants SET current_status = 'eliminated' WHERE id = ?").run(pId);
    }
    if (round.round_number === 5) {
      for (const pId of qualifiedIds) {
        db.prepare("UPDATE participants SET current_status = 'finalist' WHERE id = ?").run(pId);
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    logger.error({ err }, "Error in computeQualifiers transaction");
    throw err;
  }

  logger.info({ roundId, qualified: qualifiedIds.size, eliminated: eliminatedIds.size }, "Qualification computed");

  const socketMap = db
    .prepare("SELECT id, socket_id, current_status FROM participants WHERE competition_id = ?")
    .all(competitionId) as { id: string; socket_id: string | null; current_status: string }[];

  for (const p of socketMap) {
    if (!p.socket_id) continue;
    if (p.current_status === "finalist") {
      io.to(p.socket_id).emit("qualification_result", { qualified: true });
      io.to(p.socket_id).emit("finalist_confirmed");
    } else if (qualifiedIds.has(p.id)) {
      io.to(p.socket_id).emit("qualification_result", { qualified: true });
    } else if (eliminatedIds.has(p.id) || p.current_status === "eliminated") {
      io.to(p.socket_id).emit("qualification_result", { qualified: false });
      if (round.round_number >= 5) {
        io.to(p.socket_id).emit("eliminated_final");
      }
    }
  }

  const summary = {
    roundNumber: round.round_number,
    qualifiedCount: qualifiedIds.size,
    eliminatedCount: eliminatedIds.size,
    totalActive: n,
    qualifiedRolls,
    eliminatedRolls
  };
  io.to(`projector_${competitionId}`).emit("qualification_summary", summary);
  io.to(`admin_${competitionId}`).emit("qualification_summary", summary);

  db.prepare("UPDATE competitions SET current_round = ? WHERE id = ?").run(round.round_number, competitionId);


  if (round.round_number === 5) {
    const finalists = db
      .prepare("SELECT id, roll_number FROM participants WHERE competition_id = ? AND current_status = 'finalist'")
      .all(competitionId) as { id: string; roll_number: string }[];
    const finalistData = finalists.map((f) => ({ id: f.id, rollNumber: f.roll_number }));
    io.to(`projector_${competitionId}`).emit("finalists_ready", { finalists: finalistData });
    io.to(`admin_${competitionId}`).emit("finalists_ready", { finalists: finalistData });
  }
}
