import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { getDb } from "../database/db.js";
import { isAnswerCorrect } from "./fuzzyMatch.js";
import { getTimerState } from "./timerService.js";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

// Map: socketId → { participantId, competitionId, rollNumber }
const socketParticipantMap = new Map<
  string,
  { participantId: string; competitionId: string; rollNumber: string }
>();

// Map: rollNumber+competitionId → socketId (for reconnect handling)
const activeSocketByRoll = new Map<string, string>();

function getQualificationStats(db: any, competitionId: string) {
  const lastRound = db
    .prepare("SELECT * FROM rounds WHERE competition_id = ? AND (status = 'completed' OR status = 'active') ORDER BY round_number DESC LIMIT 1")
    .get(competitionId) as { id: string; round_number: number } | undefined;

  if (!lastRound) return null;

  const quals = db
    .prepare(`
      SELECT p.roll_number, q.qualified 
      FROM qualifications q 
      JOIN participants p ON p.id = q.participant_id 
      WHERE q.round_id = ?
    `)
    .all(lastRound.id) as { roll_number: string; qualified: number }[];

  const qualifiedRolls = quals.filter(q => q.qualified === 1).map(q => q.roll_number);
  const eliminatedRolls = quals.filter(q => q.qualified === 0).map(q => q.roll_number);

  return {
    qualifiedCount: qualifiedRolls.length,
    eliminatedCount: eliminatedRolls.length,
    qualifiedRolls,
    eliminatedRolls
  };
}

export function initializeSocketIO(httpServer: HttpServer): Server {

  const io = new Server(httpServer, {
    cors: { origin: "*", credentials: true },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    socket.on("join_competition", async ({ sessionToken, competitionId }: { sessionToken: string; competitionId: string }) => {
      try {
        const db = getDb();
        const participant = db
          .prepare("SELECT * FROM participants WHERE session_token = ? AND competition_id = ?")
          .get(sessionToken, competitionId) as {
          id: string;
          roll_number: string;
          competition_id: string;
          current_status: string;
        } | undefined;

        if (!participant) {
          socket.emit("error", { message: "Invalid session", code: "INVALID_SESSION" });
          return;
        }

        // Handle duplicate tabs: disconnect old socket
        const rollKey = `${participant.roll_number}_${competitionId}`;
        const existingSocketId = activeSocketByRoll.get(rollKey);
        if (existingSocketId && existingSocketId !== socket.id) {
          const existingSocket = io.sockets.sockets.get(existingSocketId);
          if (existingSocket) {
            existingSocket.emit("session_conflict", { message: "Session taken over by another tab" });
            socketParticipantMap.delete(existingSocketId);
          }
        }

        // Register new socket
        socketParticipantMap.set(socket.id, {
          participantId: participant.id,
          competitionId,
          rollNumber: participant.roll_number,
        });
        activeSocketByRoll.set(rollKey, socket.id);

        // Update socket_id in DB
        db.prepare("UPDATE participants SET socket_id = ? WHERE id = ?").run(socket.id, participant.id);

        // Join competition room
        await socket.join(`comp_${competitionId}`);

        // Send current state
        const competition = db.prepare("SELECT * FROM competitions WHERE id = ?").get(competitionId) as {
          id: string;
          name: string;
          status: string;
          current_round: number;
        } | undefined;

        if (!competition) return;

        const participantCount = (
          db.prepare("SELECT COUNT(*) as count FROM participants WHERE competition_id = ?").get(competitionId) as {
            count: number;
          }
        ).count;

        // Determine phase and active round
        const activeRound = db
          .prepare("SELECT * FROM rounds WHERE competition_id = ? AND status = 'active' LIMIT 1")
          .get(competitionId) as {
          id: string;
          round_number: number;
          emoji_clue: string;
          time_limit_seconds: number;
          status: string;
        } | undefined;

        let phase = "waiting";
        let timerState: { remaining: number; total: number } | null = null;
        let currentRound = null;

        if (competition.status === "completed") {
          phase = "completed";
        } else if (activeRound) {
          phase = "round_active";
          timerState = getTimerState(activeRound.id);
          currentRound = {
            id: activeRound.id,
            roundNumber: activeRound.round_number,
            emojiClue: activeRound.emoji_clue,
            timeLimitSeconds: activeRound.time_limit_seconds,
          };
        } else if (competition.current_round > 0) {
          // Check if last round ended
          const lastRound = db
            .prepare("SELECT * FROM rounds WHERE competition_id = ? AND status = 'completed' ORDER BY round_number DESC LIMIT 1")
            .get(competitionId) as { id: string; round_number: number } | undefined;

          if (lastRound) {
            const qualification = db
              .prepare("SELECT qualified FROM qualifications WHERE participant_id = ? AND round_id = ?")
              .get(participant.id, lastRound.id) as { qualified: number } | undefined;

            if (qualification) {
              phase = "round_ended";
            }
          }
        }

        const stats = phase === "round_ended" ? getQualificationStats(db, competitionId) : null;

        socket.emit("competition_state", {
          competition: { id: competition.id, name: competition.name, status: competition.status },
          participantCount,
          currentRound,
          timerRemaining: timerState?.remaining,
          timerTotal: timerState?.total,
          phase,
          participantStatus: participant.current_status,
          stats,
        });


        // Broadcast updated count
        io.to(`comp_${competitionId}`).emit("participant_count", participantCount);
        io.to(`projector_${competitionId}`).emit("participant_count", participantCount);
        io.to(`admin_${competitionId}`).emit("participant_count", participantCount);

        logger.info({ socketId: socket.id, rollNumber: participant.roll_number, competitionId }, "Participant joined");
      } catch (err) {
        logger.error({ err }, "Error in join_competition");
      }
    });

    socket.on("submit_answer", ({ sessionToken, roundId, answer, clientTimestamp }: {
      sessionToken: string;
      roundId: string;
      answer: string;
      clientTimestamp: number;
    }) => {
      try {
        if (!sessionToken || !roundId || !answer) {
          socket.emit("submission_error", { error: "Missing fields", code: "MISSING_FIELDS" });
          return;
        }

        const db = getDb();
        const participant = db
          .prepare("SELECT * FROM participants WHERE session_token = ?")
          .get(sessionToken) as { id: string; competition_id: string } | undefined;

        if (!participant) {
          socket.emit("submission_error", { error: "Invalid session", code: "INVALID_SESSION" });
          return;
        }

        const round = db.prepare("SELECT * FROM rounds WHERE id = ?").get(roundId) as {
          id: string;
          status: string;
          started_at: string;
          time_limit_seconds: number;
          correct_answers: string;
          competition_id: string;
          round_number: number;
        } | undefined;

        if (!round || round.status !== "active") {
          socket.emit("submission_error", { error: "Round not active", code: "ROUND_NOT_ACTIVE" });
          return;
        }

        // Late submission check (500ms grace period)
        const startedAt = new Date(round.started_at + " UTC").getTime();
        const serverNow = Date.now();
        const deadline = startedAt + round.time_limit_seconds * 1000 + 3500; // +3s intro delay
        if (serverNow > deadline) {
          socket.emit("submission_error", { error: "Submission too late", code: "LATE_SUBMISSION", accepted: false });
          return;
        }

        // Check correctness
        const acceptedAnswers = JSON.parse(round.correct_answers) as string[];
        const correct = isAnswerCorrect(answer, acceptedAnswers);

        const responseTimeMs = Math.min(serverNow - (startedAt + 3000), round.time_limit_seconds * 1000);

        try {
          db.prepare(
            "INSERT INTO submissions (id, participant_id, round_id, answer, is_correct, submitted_at, response_time_ms) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)"
          ).run(uuidv4(), participant.id, roundId, answer.trim(), correct ? 1 : 0, Math.max(0, responseTimeMs));
        } catch {
          // Duplicate submission (UNIQUE constraint)
          socket.emit("submission_error", { error: "Already submitted", code: "DUPLICATE_SUBMISSION" });
          return;
        }

        socket.emit("submission_accepted", { correct: null }); // Don't reveal if correct yet

        // Update submission count
        const submissionCount = (
          db.prepare("SELECT COUNT(*) as count FROM submissions WHERE round_id = ?").get(roundId) as { count: number }
        ).count;

        const totalActive = (
          db.prepare("SELECT COUNT(*) as count FROM participants WHERE competition_id = ? AND current_status = 'active'").get(participant.competition_id) as {
            count: number;
          }
        ).count;

        io.to(`comp_${participant.competition_id}`).emit("submission_count", submissionCount);
        io.to(`admin_${participant.competition_id}`).emit("submission_count", { submitted: submissionCount, total: totalActive });
        io.to(`projector_${participant.competition_id}`).emit("submission_count", { submitted: submissionCount, total: totalActive });

        logger.info({ participantId: participant.id, roundId, correct }, "Answer submitted");
      } catch (err) {
        logger.error({ err }, "Error in submit_answer");
      }
    });

    socket.on("admin_join", async ({ token, competitionId }: { token: string; competitionId?: string }) => {
      try {
        const db = getDb();
        let compId = competitionId;
        if (!compId) {
          const comp = db
            .prepare("SELECT id FROM competitions ORDER BY created_at DESC LIMIT 1")
            .get() as { id: string } | undefined;
          if (comp) compId = comp.id;
        }

        if (token === "projector_display_only") {
          if (compId) {
            await socket.join(`projector_${compId}`);
            await socket.join(`comp_${compId}`);
            const count = (
              db.prepare("SELECT COUNT(*) as count FROM participants WHERE competition_id = ?").get(compId) as { count: number }
            ).count;
            
            const competition = db.prepare("SELECT * FROM competitions WHERE id = ?").get(compId) as {
              id: string;
              name: string;
              status: string;
              current_round: number;
            } | undefined;
            
            if (competition) {
              const activeRound = db
                .prepare("SELECT * FROM rounds WHERE competition_id = ? AND status = 'active' LIMIT 1")
                .get(compId) as {
                id: string;
                round_number: number;
                emoji_clue: string;
                time_limit_seconds: number;
                status: string;
              } | undefined;
              
              let phase = "waiting";
              let timerState = null;
              let currentRound = null;
              if (competition.status === "completed") {
                phase = "completed";
              } else if (activeRound) {
                phase = "round_active";
                timerState = getTimerState(activeRound.id);
                currentRound = {
                  id: activeRound.id,
                  roundNumber: activeRound.round_number,
                  emojiClue: activeRound.emoji_clue,
                  timeLimitSeconds: activeRound.time_limit_seconds,
                };
              } else if (competition.current_round > 0) {
                phase = "round_ended";
              }
              
              const stats = phase === "round_ended" ? getQualificationStats(db, compId) : null;

              socket.emit("competition_state", {
                competition: { id: competition.id, name: competition.name, status: competition.status },
                participantCount: count,
                currentRound,
                timerRemaining: timerState?.remaining,
                timerTotal: timerState?.total,
                phase,
                stats,
              });
            }
          }
          return;
        }

        jwt.verify(token, JWT_SECRET);

        if (compId) {
          await socket.join(`admin_${compId}`);
          const count = (
            db.prepare("SELECT COUNT(*) as count FROM participants WHERE competition_id = ?").get(compId) as { count: number }
          ).count;
          socket.emit("admin_joined", { success: true, participantCount: count, competitionId: compId });
        }
      } catch {
        socket.emit("error", { message: "Invalid admin token", code: "INVALID_ADMIN_TOKEN" });
      }
    });

    socket.on("projector_join", async ({ competitionId }: { competitionId: string }) => {
      await socket.join(`projector_${competitionId}`);
      const db = getDb();
      const count = (
        db.prepare("SELECT COUNT(*) as count FROM participants WHERE competition_id = ?").get(competitionId) as { count: number }
      ).count;
      socket.emit("projector_joined", { success: true, participantCount: count });
    });

    socket.on("heartbeat", () => {
      // Connection alive check
    });

    socket.on("disconnect", () => {
      const info = socketParticipantMap.get(socket.id);
      if (info) {
        const rollKey = `${info.rollNumber}_${info.competitionId}`;
        if (activeSocketByRoll.get(rollKey) === socket.id) {
          activeSocketByRoll.delete(rollKey);
        }
        socketParticipantMap.delete(socket.id);
      }
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}
