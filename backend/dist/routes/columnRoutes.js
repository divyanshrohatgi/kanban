"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const columnController_1 = require("../controllers/columnController");
const auth_1 = require("../middlewares/auth");
const validation_1 = require("../middlewares/validation");
const r = (0, express_1.Router)();
r.use(auth_1.authenticateUser, auth_1.requireAuth);
// POST /api/columns
r.post("/", (0, validation_1.validate)("createColumn"), columnController_1.ColumnController.createColumn);
// PATCH /api/columns/:id
r.patch("/:id", (0, validation_1.validate)("updateColumn"), columnController_1.ColumnController.updateColumn);
// DELETE /api/columns/:id
r.delete("/:id", columnController_1.ColumnController.deleteColumn);
// POST /api/columns/reorder
r.post("/reorder", (0, validation_1.validate)("reorderColumns"), columnController_1.ColumnController.reorderColumns);
exports.default = r;
