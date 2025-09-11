import { Router } from "express";
import { CardController } from "../controllers/cardController";
import { authenticateUser, requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validation";

const r = Router();

r.use(authenticateUser, requireAuth);

// POST /api/cards
r.post("/", validate("createCard"), CardController.createCard);

// PATCH /api/cards/:id
r.patch("/:id", validate("updateCard"), CardController.updateCard);

// POST /api/cards/:cardId/move
r.post("/:cardId/move", validate("moveCard"), CardController.moveCard);

// DELETE /api/cards/:id
r.delete("/:id", CardController.deleteCard);

export default r;
