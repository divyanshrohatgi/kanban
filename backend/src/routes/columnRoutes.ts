import { Router } from "express";
import { ColumnController } from "../controllers/columnController";
import { authenticateUser, requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validation";

const r = Router();

r.use(authenticateUser, requireAuth);

// POST /api/columns
r.post("/", validate("createColumn"), ColumnController.createColumn);

// PATCH /api/columns/:id
r.patch("/:id", validate("updateColumn"), ColumnController.updateColumn);

// DELETE /api/columns/:id
r.delete("/:id", ColumnController.deleteColumn);

// POST /api/columns/reorder
r.post("/reorder", validate("reorderColumns"), ColumnController.reorderColumns);

export default r;
