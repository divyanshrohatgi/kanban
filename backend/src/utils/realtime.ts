// src/utils/realtime.ts
import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { PresenceService } from "../services/presenceService";

let io: Server; // initialized in initSocket()

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
      credentials: true,
    },
    path: "/ws",
  });

  io.on("connection", (socket) => {
    /**
     * Join a board room and update presence.
     * payload: { boardId: string, userId: string }
     */
    socket.on("join_board", async ({ boardId, userId }) => {
      if (!boardId || !userId) return;
      socket.join(`board:${boardId}`);
      const users = await PresenceService.joinBoard(boardId, userId);
      io.to(`board:${boardId}`).emit("presence:update", { users });
    });

    /**
     * Leave a board room and update presence.
     * payload: { boardId: string, userId: string }
     */
    socket.on("leave_board", async ({ boardId, userId }) => {
      if (!boardId || !userId) return;
      socket.leave(`board:${boardId}`);
      const users = await PresenceService.leaveBoard(boardId, userId);
      io.to(`board:${boardId}`).emit("presence:update", { users });
    });

    /**
     * Typing indicators per card.
     * payload: { cardId: string, userId: string }
     */
    socket.on("typing:start", async ({ cardId, userId }) => {
      if (!cardId || !userId) return;
      const users = await PresenceService.startTyping(cardId, userId);
      io.to(`card:${cardId}`).emit("typing:update", { users });
    });

    socket.on("typing:stop", async ({ cardId, userId }) => {
      if (!cardId || !userId) return;
      const users = await PresenceService.stopTyping(cardId, userId);
      io.to(`card:${cardId}`).emit("typing:update", { users });
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initSocket() first.");
  }
  return io;
}
