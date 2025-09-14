// src/utils/realtime.ts
import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { PresenceService } from "../services/presenceService";

let io: Server | undefined; // initialized in initSocket()

export function initSocket(httpServer: HttpServer) {
  // Prevent double-initialization (e.g., dev hot-reload)
  if (io) return io;

  io = new Server(httpServer, {
    path: "/ws",
    transports: ["websocket", "polling"],
    cors: {
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
        : true,
      credentials: true,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
    },
    allowEIO3: true,
    pingInterval: 25000,
    pingTimeout: 60000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6,
  });

  io.on("connection", (socket) => {
    /**
     * Join a board room and update presence.
     * payload: { boardId: string, userId: string }
     */
    socket.on("join_board", ({ boardId, userId }) => {
      console.log(`[Socket] User ${userId} joining board ${boardId}`);
      socket.join(`board:${boardId}`);
      socket.join(`user:${userId}`);
      
      // Notify others that user joined
      socket.to(`board:${boardId}`).emit("user:joined", { 
        id: userId, 
        name: `User ${userId.slice(0, 8)}` 
      });
      
      // Send current online users to the joining user
      if (io) {
        const room = io.sockets.adapter.rooms.get(`board:${boardId}`);
        socket.emit("presence:update", { 
          users: Array.from(room || []).map(socketId => {
            const userSocket = io!.sockets.sockets.get(socketId);
            return { 
              id: userSocket?.data?.userId || socketId.slice(0, 8),
              name: `User ${(userSocket?.data?.userId || socketId).slice(0, 8)}`
            };
          })
        });
      }
    });

    socket.on("leave_board", ({ boardId, userId }) => {
      console.log(`[Socket] User ${userId} leaving board ${boardId}`);
      socket.leave(`board:${boardId}`);
      
      // Notify others that user left
      socket.to(`board:${boardId}`).emit("user:left", userId);
    });

    /**
     * Join user's personal notification room.
     * payload: { userId: string | number }
     */
    socket.on("join_notifications", ({ userId }) => {
      if (!userId) return;
      const uid = String(userId); // ✅ normalize
      socket.join(`user:${uid}`);
      console.log(`[ws] user joined notification room: user:${uid} (sid=${socket.id})`);
    });

    /**
     * Leave a board room and update presence.
     * payload: { boardId: string, userId: string }
     */
    socket.on("leave_board", async ({ boardId, userId }) => {
      if (!boardId || !userId) return;
      socket.leave(`board:${boardId}`);
      const users = await PresenceService.leaveBoard(boardId, userId);
      io!.to(`board:${boardId}`).emit("presence:update", { users });
    });

    /**
     * Typing indicators per card.
     * payload: { cardId: string, userId: string }
     */
    socket.on("typing:start", async ({ cardId, userId }) => {
      if (!cardId || !userId) return;
      const users = await PresenceService.startTyping(cardId, userId);
      io!.to(`card:${cardId}`).emit("typing:update", { users });
    });

    socket.on("typing:stop", async ({ cardId, userId }) => {
      if (!cardId || !userId) return;
      const users = await PresenceService.stopTyping(cardId, userId);
      io!.to(`card:${cardId}`).emit("typing:update", { users });
    });

    // Optional: observe disconnects for diagnostics
    socket.on("disconnect", (reason) => {
      console.warn(`[ws] disconnect: ${reason} (sid=${socket.id})`);
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
