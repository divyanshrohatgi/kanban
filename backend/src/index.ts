// src/index.ts
import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import morgan from "morgan";

//import boardRoutes from "./routes/boardRoutes";
const boardRoutes = require("./routes/boardRoutes").default || require("./routes/boardRoutes");
import columnRoutes from "./routes/columnRoutes";
//import cardRoutes from "./routes/cardRoutes";
const cardRoutes = require("./routes/cardRoutes").default || require("./routes/cardRoutes");
import notificationRoutes from "./routes/notificationRoutes";
import authRoutes from "./routes/authRoutes";

import { initSocket } from "./utils/realtime"; // new realtime.ts

const app = express();

// CORS
const allowed = process.env.CORS_ORIGIN?.split(",").map(s => s.trim()) || ["http://localhost:5173"];
app.use(cors({ origin: allowed, credentials: true }));

// Parsers / logs
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

// Healthcheck (use this for Render + cron warmups)
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Auth
app.use("/api/auth", authRoutes);

// Kanban routes
app.use("/api/boards", boardRoutes);
app.use("/api/columns", columnRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/notifications", notificationRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Server + WebSockets
const server = http.createServer(app);
initSocket(server); // Socket.IO at /ws

const PORT = Number(process.env.PORT || 8080);
server.listen(PORT, () => console.log(`API listening on :${PORT}`));
