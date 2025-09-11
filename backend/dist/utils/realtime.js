"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIO = getIO;
// src/utils/realtime.ts
const socket_io_1 = require("socket.io");
const presenceService_1 = require("../services/presenceService");
let io; // initialized in initSocket()
function initSocket(httpServer) {
    io = new socket_io_1.Server(httpServer, {
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
            if (!boardId || !userId)
                return;
            socket.join(`board:${boardId}`);
            const users = await presenceService_1.PresenceService.joinBoard(boardId, userId);
            io.to(`board:${boardId}`).emit("presence:update", { users });
        });
        /**
         * Leave a board room and update presence.
         * payload: { boardId: string, userId: string }
         */
        socket.on("leave_board", async ({ boardId, userId }) => {
            if (!boardId || !userId)
                return;
            socket.leave(`board:${boardId}`);
            const users = await presenceService_1.PresenceService.leaveBoard(boardId, userId);
            io.to(`board:${boardId}`).emit("presence:update", { users });
        });
        /**
         * Typing indicators per card.
         * payload: { cardId: string, userId: string }
         */
        socket.on("typing:start", async ({ cardId, userId }) => {
            if (!cardId || !userId)
                return;
            const users = await presenceService_1.PresenceService.startTyping(cardId, userId);
            io.to(`card:${cardId}`).emit("typing:update", { users });
        });
        socket.on("typing:stop", async ({ cardId, userId }) => {
            if (!cardId || !userId)
                return;
            const users = await presenceService_1.PresenceService.stopTyping(cardId, userId);
            io.to(`card:${cardId}`).emit("typing:update", { users });
        });
    });
    return io;
}
function getIO() {
    if (!io) {
        throw new Error("Socket.io not initialized. Call initSocket() first.");
    }
    return io;
}
