"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cardController_1 = require("../controllers/cardController");
const auth_1 = require("../middlewares/auth");
const validation_1 = require("../middlewares/validation");
const r = (0, express_1.Router)();
r.use(auth_1.authenticateUser, auth_1.requireAuth);
// POST /api/cards
r.post("/", (0, validation_1.validate)("createCard"), cardController_1.CardController.createCard);
// PATCH /api/cards/:id
r.patch("/:id", (0, validation_1.validate)("updateCard"), cardController_1.CardController.updateCard);
// POST /api/cards/:cardId/move
r.post("/:cardId/move", (0, validation_1.validate)("moveCard"), cardController_1.CardController.moveCard);
// DELETE /api/cards/:id
r.delete("/:id", cardController_1.CardController.deleteCard);
exports.default = r;
