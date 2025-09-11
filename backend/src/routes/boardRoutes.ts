import { Router } from "express";
import { BoardController } from "../controllers/boardController";
import { authenticateUser, requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validation";

const r = Router();

// All board routes require auth
r.use(authenticateUser, requireAuth);

// POST /api/boards
r.post("/", validate("createBoard"), BoardController.createBoard);

// GET /api/boards
r.get("/", BoardController.getBoards);

// GET /api/boards/:id
r.get("/:id", BoardController.getBoardById);

// PATCH /api/boards/:id
r.patch("/:id", validate("updateBoard"), BoardController.updateBoard);

// DELETE /api/boards/:id
r.delete("/:id", BoardController.deleteBoard);

// POST /api/boards/:boardId/members
r.post("/:boardId/members", validate("addMember"), BoardController.addMember);

// DELETE /api/boards/:boardId/members
r.delete("/:boardId/members", validate("removeMember"), BoardController.removeMember);

export default r;
