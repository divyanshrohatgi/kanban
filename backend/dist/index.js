"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
//import boardRoutes from "./routes/boardRoutes";
const boardRoutes = require("./routes/boardRoutes").default || require("./routes/boardRoutes");
const columnRoutes_1 = __importDefault(require("./routes/columnRoutes"));
//import cardRoutes from "./routes/cardRoutes";
const cardRoutes = require("./routes/cardRoutes").default || require("./routes/cardRoutes");
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const realtime_1 = require("./utils/realtime"); // new realtime.ts
const app = (0, express_1.default)();
// CORS
const allowed = process.env.CORS_ORIGIN?.split(",").map(s => s.trim()) || ["http://localhost:5173"];
app.use((0, cors_1.default)({ origin: allowed, credentials: true }));
// Parsers / logs
app.use(express_1.default.json({ limit: "1mb" }));
app.use((0, morgan_1.default)("tiny"));
// Healthcheck (use this for Render + cron warmups)
app.get("/healthz", (_req, res) => res.json({ ok: true }));
// Auth
app.use("/api/auth", authRoutes_1.default);
// Kanban routes
app.use("/api/boards", boardRoutes);
app.use("/api/columns", columnRoutes_1.default);
app.use("/api/cards", cardRoutes);
app.use("/api/notifications", notificationRoutes_1.default);
// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
// Server + WebSockets
const server = http_1.default.createServer(app);
(0, realtime_1.initSocket)(server); // Socket.IO at /ws
const PORT = Number(process.env.PORT || 8080);
server.listen(PORT, () => console.log(`API listening on :${PORT}`));
