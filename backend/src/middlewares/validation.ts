import { Request, Response, NextFunction } from "express";

// ---------- helpers ----------
function isUuid(v: any): v is string {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function isNonEmptyString(v: any, max?: number) {
  return typeof v === "string" && v.trim().length > 0 && (!max || v.length <= max);
}
function isNullableString(v: any, max?: number) {
  return v == null || (typeof v === "string" && (!max || v.length <= max));
}
function isNonNegInt(v: any) {
  return Number.isInteger(v) && v >= 0;
}
function isIsoDateString(v: any) {
  if (typeof v !== "string") return false;
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

// Returns `null` when valid, or an error string when invalid
type ValidatorFn = (req: Request) => string | null;

// ---------- Board ----------
const createBoard: ValidatorFn = (req) => {
  const { title, description, members } = req.body || {};
  if (!isNonEmptyString(title, 200)) return "title is required (string, max 200)";
  if (!isNullableString(description, 2000)) return "description must be string or null (max 2000)";
  if (members != null) {
    if (!Array.isArray(members)) return "members must be an array";
    for (const m of members) {
      if (!m || !isUuid(m.userId)) return "members[*].userId must be a UUID";
      if (!["owner", "editor", "viewer"].includes(m.role))
        return "members[*].role must be one of owner|editor|viewer";
    }
  }
  return null;
};

const updateBoard: ValidatorFn = (req) => {
  const { title, description } = req.body || {};
  if (title != null && !isNonEmptyString(title, 200)) return "title must be a non-empty string (max 200)";
  if (description != null && !isNullableString(description, 2000))
    return "description must be string or null (max 2000)";
  return null;
};

const addMember: ValidatorFn = (req) => {
  const { userId, role } = req.body || {};
  if (!isUuid(userId)) return "userId must be a UUID";
  if (!["owner", "editor", "viewer"].includes(role)) return "role must be owner|editor|viewer";
  return null;
};

const removeMember: ValidatorFn = (req) => {
  const { userId } = req.body || {};
  if (!isUuid(userId)) return "userId must be a UUID";
  return null;
};

// ---------- Column ----------
const createColumn: ValidatorFn = (req) => {
  const { boardId, title, position } = req.body || {};
  if (!isUuid(boardId)) return "boardId must be a UUID";
  if (!isNonEmptyString(title, 120)) return "title is required (string, max 120)";
  if (!isNonNegInt(position)) return "position must be a non-negative integer";
  return null;
};

const updateColumn: ValidatorFn = (req) => {
  const { title } = req.body || {};
  if (!isNonEmptyString(title, 120)) return "title is required (string, max 120)";
  return null;
};

const reorderColumns: ValidatorFn = (req) => {
  const { boardId, order } = req.body || {};
  if (!isUuid(boardId)) return "boardId must be a UUID";
  if (!Array.isArray(order) || order.length === 0) return "order must be a non-empty array";
  for (const o of order) {
    if (!o || !isUuid(o.columnId)) return "order[*].columnId must be a UUID";
    if (!isNonNegInt(o.position)) return "order[*].position must be a non-negative integer";
  }
  return null;
};

// ---------- Card ----------
const createCard: ValidatorFn = (req) => {
  const { boardId, columnId, title, description, assigneeId, labels, dueDate, position } = req.body || {};
  if (!isUuid(boardId)) return "boardId must be a UUID";
  if (!isUuid(columnId)) return "columnId must be a UUID";
  if (!isNonEmptyString(title, 200)) return "title is required (string, max 200)";
  if (!isNullableString(description, 8000)) return "description must be string or null (max 8000)";
  if (assigneeId != null && !isUuid(assigneeId)) return "assigneeId must be a UUID or null";
  if (labels != null) {
    if (!Array.isArray(labels)) return "labels must be an array of strings";
    for (const l of labels) {
      if (!isNonEmptyString(l, 32)) return "each label must be a non-empty string (max 32)";
    }
  }
  if (dueDate != null && !isIsoDateString(dueDate)) return "dueDate must be an ISO datetime string";
  if (!isNonNegInt(position)) return "position must be a non-negative integer";
  return null;
};

const updateCard: ValidatorFn = (req) => {
  const { version, title, description, assigneeId, labels, dueDate } = req.body || {};
  if (!isNonNegInt(version)) return "version is required and must be a non-negative integer";
  if (title != null && !isNonEmptyString(title, 200)) return "title must be a non-empty string (max 200)";
  if (description != null && !isNullableString(description, 8000))
    return "description must be string or null (max 8000)";
  if (assigneeId != null && !isUuid(assigneeId)) return "assigneeId must be a UUID or null";
  if (labels != null) {
    if (!Array.isArray(labels)) return "labels must be an array of strings";
    for (const l of labels) {
      if (!isNonEmptyString(l, 32)) return "each label must be a non-empty string (max 32)";
    }
  }
  if (dueDate != null && !isIsoDateString(dueDate)) return "dueDate must be an ISO datetime string";
  return null;
};

const moveCard: ValidatorFn = (req) => {
  const { version, toColumnId, toIndex } = req.body || {};
  if (!isNonNegInt(version)) return "version is required and must be a non-negative integer";
  if (!isUuid(toColumnId)) return "toColumnId must be a UUID";
  if (!isNonNegInt(toIndex)) return "toIndex must be a non-negative integer";
  return null;
};

// ---------- registry ----------
const registry: Record<string, ValidatorFn> = {
  createBoard,
  updateBoard,
  addMember,
  removeMember,
  createColumn,
  updateColumn,
  reorderColumns,
  createCard,
  updateCard,
  moveCard,
};

/**
 * Usage in routes: `validate("createBoard")`
 */
export function validate(name: keyof typeof registry) {
  const fn = registry[name];
  if (!fn) throw new Error(`Unknown validator: ${String(name)}`);
  return (req: Request, res: Response, next: NextFunction) => {
    const err = fn(req);
    if (err) return res.status(400).json({ error: "Validation failed", details: err });
    next();
  };
}
