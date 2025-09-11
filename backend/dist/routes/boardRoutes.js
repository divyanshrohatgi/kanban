"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const boardController_1 = require("../controllers/boardController");
const auth_1 = require("../middlewares/auth");
const validation_1 = require("../middlewares/validation");
const r = (0, express_1.Router)();
// All board routes require auth
r.use(auth_1.authenticateUser, auth_1.requireAuth);
// POST /api/boards
r.post("/", (0, validation_1.validate)("createBoard"), boardController_1.BoardController.createBoard);
// GET /api/boards
r.get("/", boardController_1.BoardController.getBoards);
// GET /api/boards/:id
r.get("/:id", boardController_1.BoardController.getBoardById);
// PATCH /api/boards/:id
r.patch("/:id", (0, validation_1.validate)("updateBoard"), boardController_1.BoardController.updateBoard);
// DELETE /api/boards/:id
r.delete("/:id", boardController_1.BoardController.deleteBoard);
// POST /api/boards/:boardId/members
r.post("/:boardId/members", (0, validation_1.validate)("addMember"), boardController_1.BoardController.addMember);
// DELETE /api/boards/:boardId/members
r.delete("/:boardId/members", (0, validation_1.validate)("removeMember"), boardController_1.BoardController.removeMember);
exports.default = r;
