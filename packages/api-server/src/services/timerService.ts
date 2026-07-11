import type { Server } from "socket.io";
import { getDb } from "../database/db.js";
import { logger } from "../lib/logger.js";

interface TimerEntry {
  startTime: number;
  durationMs: number;
  competitionId: string;
  interval: ReturnType<typeof setInterval>;
}

const timers = new Map<string, TimerEntry>();

export function startTimer(
  roundId: string,
  durationSeconds: number,
  competitionId: string,
  io: Server
) {
  // Clear any existing timer
  clearTimer(roundId);

  const startTime = Date.now();
  const durationMs = durationSeconds * 1000;

  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, durationMs - elapsed);

    io.to(`comp_${competitionId}`).emit("timer_tick", { remaining, total: durationMs });

    if (remaining <= 0) {
      clearTimer(roundId);
      endRound(roundId, competitionId, io).catch((err) => {
        logger.error({ err }, "Error ending round from timer");
      });
    }
  }, 1000);

  timers.set(roundId, { startTime, durationMs, competitionId, interval });
  logger.info({ roundId, durationSeconds, competitionId }, "Timer started");
}

export async function endRound(roundId: string, competitionId: string, io: Server) {
  const db = getDb();

  db.prepare("UPDATE rounds SET status = 'completed', ended_at = datetime('now') WHERE id = ?").run(roundId);
  logger.info({ roundId }, "Round ended");

  io.to(`comp_${competitionId}`).emit("round_ended", { roundId });

  // Trigger elimination asynchronously
  const { computeQualifiers } = await import("./eliminationService.js");
  await computeQualifiers(roundId, competitionId, io);
}

export function getTimerState(roundId: string): { remaining: number; total: number } | null {
  const entry = timers.get(roundId);
  if (!entry) return null;
  const elapsed = Date.now() - entry.startTime;
  const remaining = Math.max(0, entry.durationMs - elapsed);
  return { remaining, total: entry.durationMs };
}

export function clearTimer(roundId: string) {
  const entry = timers.get(roundId);
  if (entry) {
    clearInterval(entry.interval);
    timers.delete(roundId);
    logger.info({ roundId }, "Timer cleared");
  }
}
