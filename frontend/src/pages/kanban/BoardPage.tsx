import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { boardsAPI } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import TeamDialog from "../../components/kanban/TeamDialog";
import * as localNotifs from "../../components/notifications/store";

interface Card {
  id: string;
  column_id: string;
  title: string;
  description?: string;
  assignee_id?: string | null;
  labels?: string[];
  due_date?: string | null;
  position: number;
  version?: number;
}

interface Column {
  id: string;
  title: string;
  position: number;
  cards: Card[];
}

interface FullBoard {
  id: string;
  title: string;
  columns: Column[];
  board_members?: Array<{ user_id: string; role: "owner" | "editor" | "viewer"; username?: string }>;
}

interface PresenceUser {
  id: string;
  username: string;
}

export const BoardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [board, setBoard] = useState<FullBoard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [newColumnTitle, setNewColumnTitle] = useState<string>("");
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [newCardTitleByColumn, setNewCardTitleByColumn] = useState<Record<string, string>>({});
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  const [filterPrio, setFilterPrio] = useState<"all" | "high" | "medium" | "low">("all");
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [newCardPrioByColumn, setNewCardPrioByColumn] = useState<Record<string, "none" | "high" | "medium" | "low">>({});
  const [newCardAssigneeByColumn, setNewCardAssigneeByColumn] = useState<Record<string, string>>({});
  const [newCardDueByColumn, setNewCardDueByColumn] = useState<Record<string, string>>({});
  const [advancedAddOpenByColumn, setAdvancedAddOpenByColumn] = useState<Record<string, boolean>>({});
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });
  const [teamOpen, setTeamOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const getColumnTint = (index: number) => {
    const tints = [
      "bg-blue-50 dark:bg-blue-950/30",
      "bg-green-50 dark:bg-green-950/30",
      "bg-amber-50 dark:bg-amber-950/30",
      "bg-purple-50 dark:bg-purple-950/30",
      "bg-cyan-50 dark:bg-cyan-950/30",
    ];
    return tints[index % tints.length];
  };

  const hasPriority = (labels?: string[], level?: "high" | "medium" | "low") => {
    if (!labels || !labels.length) return false;
    return labels.some((l) => l.toLowerCase() === `prio-${level}`);
  };
  const [, setDraggingCardId] = useState<string | null>(null);
  const revertingStateRef = useRef<FullBoard | null>(null);

  // Sanitize id in case it contains accidental "id:" prefix
  const sanitizedId = (id || "").replace(/^id:\s*/i, "").trim();

  const socket: Socket | null = useMemo((): Socket | null => {
    if (!sanitizedId) return null;
    // Use same-origin socket in dev (proxied) and allow env override in prod via Vite define
    const meta = import.meta as unknown as { env: { VITE_BACKEND_URL?: string } };
    const url = meta?.env?.VITE_BACKEND_URL || undefined;
    const s = io(url, { path: "/ws", withCredentials: true });
    return s;
  }, [sanitizedId]);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await boardsAPI.get(sanitizedId);
        const raw: { id: string; title: string; columns?: Array<{ id: string; title: string; position?: number; cards?: Card[] }>; board_members?: Array<{ user_id: string; role: "owner" | "editor" | "viewer"; username?: string }>; } = res.data;
        const normalizedColumns: Column[] = Array.isArray(raw?.columns)
          ? raw.columns.map((c) => ({ id: c.id, title: c.title, position: c.position ?? 0, cards: Array.isArray(c?.cards) ? c.cards : [] }))
          : [];
        setBoard({ id: raw.id, title: raw.title, columns: normalizedColumns, board_members: raw.board_members || [] });
      } catch (e) {
        let message = "Failed to load board";
        const err = e as unknown as { response?: { data?: { error?: string } } };
        if (err && err.response && err.response.data && typeof err.response.data.error === "string") {
          message = err.response.data.error;
        } else if (e instanceof Error) {
          message = e.message;
        }
        setError(message);
        setBoard(null);
      } finally {
        setLoading(false);
      }
    };
    if (sanitizedId) fetch();
  }, [sanitizedId]);

  useEffect(() => {
    if (!socket || !sanitizedId) return;
    socket.on("connect", () => {
      if (user?.id) {
        socket.emit("join_board", { boardId: sanitizedId, userId: user.id });
        console.debug("WS: joined board", sanitizedId, "as", user.id);
      }
    });
    // Debug: log all events
    const anyHandler = (...a: unknown[]) => {
      try { console.debug("WS event:", a[0], a[1]); } catch { /* noop */ }
    };
    (socket as unknown as { onAny?: (cb: (...a: unknown[]) => void) => void }).onAny?.(anyHandler);
    socket.on("board:updated", (payload: { board: FullBoard }) => {
      setBoard(payload.board);
    });
    socket.on("column:created", (payload: { column: { id: string; board_id: string; title: string; position?: number } }) => {
      setBoard((prev) => {
        if (!prev || payload.column.board_id !== sanitizedId) return prev;
        const exists = prev.columns.some((c) => c.id === payload.column.id);
        if (exists) return prev;
        const next: Column = {
          id: payload.column.id,
          title: payload.column.title,
          position: payload.column.position ?? prev.columns.length,
          cards: [],
        };
        return { ...prev, columns: [...prev.columns, next] };
      });
      toast.success(`Column "${payload.column.title}" created`);
      localNotifs.add(`Column created: ${payload.column.title}`);
    });
    socket.on("column:updated", (payload: { column: { id: string; title: string } }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((c) => (c.id === payload.column.id ? { ...c, title: payload.column.title } : c)),
        };
      });
      toast.info("Column updated");
      localNotifs.add("Column updated");
    });
    socket.on("column:deleted", (payload: { columnId: string }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return { ...prev, columns: prev.columns.filter((c) => c.id !== payload.columnId) };
      });
      toast.info("Column deleted");
      localNotifs.add("Column deleted");
    });
    socket.on("card:created", (payload: { card: Card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const copy: FullBoard = JSON.parse(JSON.stringify(prev));
        const col = copy.columns.find((c) => c.id === payload.card.column_id);
        if (!col) return prev;
        col.cards.push(payload.card);
        col.cards.forEach((c, i) => (c.position = i));
        return copy;
      });
      toast.success(`Card "${payload.card.title}" added`);
      localNotifs.add(`Card added: ${payload.card.title}`);
    });
    socket.on("card:updated", (payload: { card: Card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const copy: FullBoard = JSON.parse(JSON.stringify(prev));
        const col = copy.columns.find((c) => c.id === payload.card.column_id);
        if (!col) return prev;
        const idx = col.cards.findIndex((c) => c.id === payload.card.id);
        if (idx >= 0) col.cards[idx] = payload.card;
        return copy;
      });
      toast.info("Card updated");
      localNotifs.add("Card updated");
    });
    socket.on("card:deleted", (payload: { cardId: string }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const copy: FullBoard = JSON.parse(JSON.stringify(prev));
        for (const col of copy.columns) {
          const idx = col.cards.findIndex((c) => c.id === payload.cardId);
          if (idx >= 0) {
            col.cards.splice(idx, 1);
            col.cards.forEach((c, i) => (c.position = i));
            break;
          }
        }
        return copy;
      });
      toast.info("Card deleted");
      localNotifs.add("Card deleted");
    });
    // Team membership updates
    socket.on("board:memberAdded", (p: { userId: string; role: "owner" | "editor" | "viewer" }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const members = prev.board_members || [];
        if (members.some((m) => m.user_id === p.userId)) return prev;
        return { ...prev, board_members: [...members, { user_id: p.userId, role: p.role }] } as FullBoard;
      });
      toast.success("Member added to board");
      localNotifs.add("Member added to board");
    });
    socket.on("board:memberRemoved", (p: { userId: string }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const members = prev.board_members || [];
        return { ...prev, board_members: members.filter((m) => m.user_id !== p.userId) } as FullBoard;
      });
      toast.info("Member removed from board");
      localNotifs.add("Member removed from board");
    });
    socket.on("presence:update", (payload: { users: { id: string }[] }) => {
      // We only have ids; display as anonymous if usernames not provided
      const mapped: PresenceUser[] = (payload.users || []).map((u) => ({ id: u.id, username: u.id }));
      setOnlineUsers(mapped);
    });
    socket.on("card:moved", (data: { id: string; to_column_id: string; to_position: number }) => {
      // Server-ack reconcile
      setBoard((prev) => {
        if (!prev) return prev;
        const copy: FullBoard = JSON.parse(JSON.stringify(prev));
        const fromCol = copy.columns.find((c) => c.cards.some((cd) => cd.id === data.id));
        if (!fromCol) return prev;
        const cardIdx = fromCol.cards.findIndex((cd) => cd.id === data.id);
        const [card] = fromCol.cards.splice(cardIdx, 1);
        card.column_id = data.to_column_id;
        const toCol = copy.columns.find((c) => c.id === data.to_column_id);
        if (!toCol) return prev;
        toCol.cards.splice(Math.min(data.to_position, toCol.cards.length), 0, card);
        toCol.cards.forEach((c, i) => (c.position = i));
        fromCol.cards.forEach((c, i) => (c.position = i));
        return copy;
      });
    });
    return () => {
      if (user?.id) socket.emit("leave_board", { boardId: sanitizedId, userId: user.id });
      socket.disconnect();
    };
  }, [socket, sanitizedId, user?.id, user?.username]);

  const handleAddColumn = async () => {
    if (!sanitizedId || !newColumnTitle.trim()) return;
    const res = await boardsAPI.createColumn({ boardId: sanitizedId, title: newColumnTitle, position: (board?.columns?.length ?? 0) });
    setNewColumnTitle("");
    setBoard((prev) => {
      if (!prev) return prev;
      const col = res.data as { id: string; title: string; position?: number };
      return { ...prev, columns: [...prev.columns, { id: col.id, title: col.title, position: col.position ?? prev.columns.length, cards: [] }] };
    });
  };

  const handleAddCard = async (columnId: string) => {
    const title = (newCardTitleByColumn[columnId] || "").trim();
    if (!title) return;
    try {
      const currentCol = board?.columns.find((c) => c.id === columnId);
      const position = (currentCol?.cards?.length ?? 0);
      const prio = newCardPrioByColumn[columnId] || "none";
      const assigneeId = newCardAssigneeByColumn[columnId] || null;
      const dueDate = newCardDueByColumn[columnId] || null;
      const labels = [
        ...(prio !== "none" ? [`prio-${prio}`] : []),
      ];
      const res = await boardsAPI.createCard(sanitizedId, {
        columnId,
        title,
        description: null,
        assigneeId,
        labels,
        dueDate,
        position,
      });
      setNewCardTitleByColumn((prev) => ({ ...prev, [columnId]: "" }));
      setNewCardPrioByColumn((prev) => ({ ...prev, [columnId]: "none" }));
      setNewCardAssigneeByColumn((prev) => ({ ...prev, [columnId]: "" }));
      setNewCardDueByColumn((prev) => ({ ...prev, [columnId]: "" }));
      setBoard((prev) => {
        if (!prev) return prev;
        const copy: FullBoard = JSON.parse(JSON.stringify(prev));
        const col = copy.columns.find((c) => c.id === columnId);
        if (!col) return prev;
        const created = res.data as { id: string; column_id: string; title: string; description?: string | null; assignee_id?: string | null; labels?: string[]; due_date?: string | null; position: number; version?: number };
        const normalized: Card = {
          id: created.id,
          column_id: created.column_id || columnId,
          title: created.title,
          description: created.description ?? undefined,
          assignee_id: (created.assignee_id ?? assigneeId ?? undefined) as string | undefined,
          labels: created.labels ?? labels,
          due_date: created.due_date ?? (dueDate || undefined),
          position: created.position ?? position,
          version: created.version,
        };
        col.cards.push(normalized);
        col.cards.forEach((c, i) => (c.position = i));
        return copy;
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add card";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-600">Board not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{board.title}</h1>
          <div className="flex gap-2">
            <Input
              placeholder="New column"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              className="w-56 focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="New column title"
            />
            <Button onClick={handleAddColumn} aria-label="Add column">Add Column</Button>
            <Button onClick={() => setIsDark((v) => !v)} aria-label="Toggle theme">
              {isDark ? "Light" : "Dark"}
            </Button>
            <Button variant="outline" aria-label="Manage team" onClick={() => setTeamOpen(true)}>Team</Button>
          </div>
        </div>
        <TeamDialog
          boardId={sanitizedId}
          open={teamOpen}
          onOpenChange={setTeamOpen}
          members={(board.board_members || []).map((m) => ({ user_id: m.user_id, role: m.role, username: m.username }))}
          canManage={(board.board_members || []).some((m) => m.user_id === user?.id && m.role === "owner")}
          onMembersChange={(next) => {
            setBoard((prev) => (prev ? { ...prev, board_members: next } as unknown as FullBoard : prev));
          }}
        />

        {/* Search / Filter Bar */}
        <div className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex items-center gap-3">
          <Input
            placeholder="Search tasks (title)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search tasks"
          />
          <select
            aria-label="Filter priority"
            className="border border-gray-200 dark:border-gray-700 rounded-md px-2 py-2 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
            value={filterPrio}
            onChange={(e) => setFilterPrio(e.target.value as "all" | "high" | "medium" | "low")}
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Presence Bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="text-sm text-gray-600">Online:</div>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.length === 0 ? (
              <span className="text-sm text-gray-400">No one else online</span>
            ) : (
              onlineUsers.map((u) => (
                <span key={u.id} className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                  {u.username}
                </span>
              ))
            )}
          </div>
        </div>

        <div
          className="flex gap-6 md:gap-8 overflow-x-auto pb-4"
          role="listbox"
          aria-label="Columns"
        >
          {(board.columns || [])
            .slice()
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((col) => (
              <div
                key={col.id}
                role="option"
                aria-label={`Column ${col.title}`}
                className={
                  `min-w-[300px] w-80 rounded-xl border p-3 transition-shadow motion-safe:duration-200 ` +
                  `shadow-sm hover:shadow-md ` +
                  (dragOverColumnId === col.id ? " ring-2 ring-blue-400 border-blue-300 " : " border-gray-200 ") +
                  ` ${getColumnTint((board.columns || []).indexOf(col))}`
                }
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColumnId(col.id);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  const cardId = e.dataTransfer.getData("text/card-id");
                  if (!cardId || !sanitizedId) return;
                  const toPosition = (col.cards || []).length;
                  // optimistic move
                  revertingStateRef.current = board;
                  setBoard((prev) => {
                    if (!prev) return prev;
                    const copy: FullBoard = JSON.parse(JSON.stringify(prev));
                    const fromCol = copy.columns.find((c) => (c.cards || []).some((cd) => cd.id === cardId));
                    const toCol = copy.columns.find((c) => c.id === col.id);
                    if (!fromCol || !toCol) return prev;
                    const cardIdx = (fromCol.cards || []).findIndex((cd) => cd.id === cardId);
                    const [card] = fromCol.cards.splice(cardIdx, 1);
                    card.column_id = col.id;
                    toCol.cards.splice(toPosition, 0, card);
                    toCol.cards.forEach((c, i) => (c.position = i));
                    fromCol.cards.forEach((c, i) => (c.position = i));
                    return copy;
                  });
                  setDraggingCardId(null);
                  setDragOverColumnId(null);
                  try {
                    await boardsAPI.moveCard(cardId, { toColumnId: col.id, toIndex: toPosition });
                    toast.success("Card moved");
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Failed to move card";
                    toast.error(message);
                    // revert
                    if (revertingStateRef.current) setBoard(revertingStateRef.current);
                  }
                }}
                onDragLeave={() => setDragOverColumnId((prev) => (prev === col.id ? null : prev))}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-gray-800">{col.title}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{(col.cards || []).length}</div>
                    <button
                      className="md:hidden text-xs text-gray-600 hover:text-gray-800"
                      onClick={() => setCollapsedColumns((prev) => ({ ...prev, [col.id]: !prev[col.id] }))}
                      aria-label={collapsedColumns[col.id] ? `Expand ${col.title}` : `Collapse ${col.title}`}
                    >
                      {collapsedColumns[col.id] ? "Expand" : "Collapse"}
                    </button>
                    <button
                      className="text-xs text-red-600 hover:text-red-700"
                      onClick={async () => {
                        try {
                          await boardsAPI.deleteColumn(col.id);
                          setBoard((prev) => prev ? { ...prev, columns: prev.columns.filter((c) => c.id !== col.id) } : prev);
                        } catch (e) {
                          const msg = e instanceof Error ? e.message : "Failed to delete column";
                          toast.error(msg);
                        }
                      }}
                      aria-label={`Delete column ${col.title}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Input
                    placeholder="Add a card"
                    value={newCardTitleByColumn[col.id] || ""}
                    onChange={(e) => setNewCardTitleByColumn((prev) => ({ ...prev, [col.id]: e.target.value }))}
                    aria-label={`Add a card to ${col.title}`}
                    className="focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  <Input
                    placeholder="Assignee ID (optional)"
                    value={newCardAssigneeByColumn[col.id] || ""}
                    onChange={(e) => setNewCardAssigneeByColumn((prev) => ({ ...prev, [col.id]: e.target.value }))}
                    aria-label={`Assignee for ${col.title}`}
                    className="w-40 focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  <Input
                    type="datetime-local"
                    value={newCardDueByColumn[col.id] || ""}
                    onChange={(e) => setNewCardDueByColumn((prev) => ({ ...prev, [col.id]: e.target.value }))}
                    aria-label={`Due date for ${col.title}`}
                    className="w-52 focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  <Button onClick={() => handleAddCard(col.id)} aria-label={`Add card to ${col.title}`}>Add</Button>
                  <button
                    className="text-xs text-gray-600 hover:text-gray-800"
                    onClick={() => setAdvancedAddOpenByColumn((prev: Record<string, boolean>) => ({ ...prev, [col.id]: !prev[col.id] }))}
                    aria-label={(advancedAddOpenByColumn[col.id] ? `Hide advanced for ${col.title}` : `Show advanced for ${col.title}`)}
                  >
                    {advancedAddOpenByColumn[col.id] ? "Less" : "More"}
                  </button>
                </div>
                {advancedAddOpenByColumn[col.id] && (
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <select
                      aria-label={`Select priority for ${col.title}`}
                      className="border border-gray-200 dark:border-gray-700 rounded-md px-2 py-2 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
                      value={newCardPrioByColumn[col.id] || "none"}
                      onChange={(e) => setNewCardPrioByColumn((prev) => ({ ...prev, [col.id]: e.target.value as "none" | "high" | "medium" | "low" }))}
                    >
                      <option value="none">No priority</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                )}
                {!collapsedColumns[col.id] && (
                <div className="space-y-2">
                  {(col.cards || [])
                    .slice()
                    .filter((c) => !query || c.title.toLowerCase().includes(query.toLowerCase()))
                    .filter((c) => {
                      if (filterPrio === "all") return true;
                      return hasPriority(c.labels, filterPrio);
                    })
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                    .map((card, idx) => (
                      <div
                        key={card.id}
                        role="listitem"
                        aria-label={`Card ${card.title}`}
                        className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-transform motion-safe:duration-150 motion-safe:hover:scale-[1.02]"
                        draggable
                        onDragStart={(e) => {
                          setDraggingCardId(card.id);
                          e.dataTransfer.setData("text/card-id", card.id);
                          e.dataTransfer.effectAllowed = "move";
                          // ghost
                          if (e.currentTarget) {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const ghost = (e.currentTarget as HTMLElement).cloneNode(true) as HTMLElement;
                            ghost.style.position = "absolute";
                            ghost.style.top = "-9999px";
                            ghost.style.left = "-9999px";
                            ghost.style.width = `${rect.width}px`;
                            document.body.appendChild(ghost);
                            e.dataTransfer.setDragImage(ghost, 10, 10);
                            setTimeout(() => document.body.removeChild(ghost), 0);
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        tabIndex={0}
                        onKeyDown={async (e) => {
                          if ((e.ctrlKey || e.metaKey) && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                            e.preventDefault();
                            const toPosition = Math.max(0, Math.min((col.cards?.length || 1) - 1, (e.key === "ArrowUp" ? idx - 1 : idx + 1)));
                            if (toPosition === idx) return;
                            try {
                              await boardsAPI.moveCard(card.id, { toColumnId: col.id, toIndex: toPosition });
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Move failed");
                            }
                          }
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          const cardId = e.dataTransfer.getData("text/card-id");
                          if (!cardId || !sanitizedId) return;
                          if (cardId === card.id) return;
                          const toPosition = idx; // insert before this card
                          revertingStateRef.current = board;
                          setBoard((prev) => {
                            if (!prev) return prev;
                            const copy: FullBoard = JSON.parse(JSON.stringify(prev));
                            const fromCol = copy.columns.find((c) => (c.cards || []).some((cd) => cd.id === cardId));
                            const targetCol = copy.columns.find((c) => c.id === col.id);
                            if (!fromCol || !targetCol) return prev;
                            const fromIdx = (fromCol.cards || []).findIndex((cd) => cd.id === cardId);
                            const [moving] = fromCol.cards.splice(fromIdx, 1);
                            moving.column_id = col.id;
                            targetCol.cards.splice(Math.max(0, Math.min(toPosition, targetCol.cards.length)), 0, moving);
                            targetCol.cards.forEach((c, i) => (c.position = i));
                            fromCol.cards.forEach((c, i) => (c.position = i));
                            return copy;
                          });
                          setDraggingCardId(null);
                          try {
                            await boardsAPI.moveCard(cardId, { toColumnId: col.id, toIndex: toPosition });
                            toast.success("Card moved");
                          } catch (err) {
                            const message = err instanceof Error ? err.message : "Failed to move card";
                            toast.error(message);
                            if (revertingStateRef.current) setBoard(revertingStateRef.current);
                          }
                        }}
                        onDragEnd={() => setDraggingCardId(null)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-gray-900">{card.title}</div>
                          <div className="flex items-center gap-2">
                            {/* Fallback move controls to work everywhere */}
                            <button
                              className="text-xs text-gray-600 hover:text-gray-900"
                              onClick={async () => {
                                const to = Math.max(0, (card.position ?? idx) - 1);
                                if (to === idx) return;
                                try {
                                  await boardsAPI.moveCard(card.id, { toColumnId: col.id, toIndex: to });
                                  setBoard((prev) => {
                                    if (!prev) return prev;
                                    const copy: FullBoard = JSON.parse(JSON.stringify(prev));
                                    const targetCol = copy.columns.find((c) => c.id === col.id);
                                    if (!targetCol) return prev;
                                    const fromIdx = (targetCol.cards || []).findIndex((c) => c.id === card.id);
                                    const [moving] = targetCol.cards.splice(fromIdx, 1);
                                    targetCol.cards.splice(to, 0, moving);
                                    targetCol.cards.forEach((c, i) => (c.position = i));
                                    return copy;
                                  });
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : "Move failed");
                                }
                              }}
                              aria-label="Move up"
                            >
                              ↑
                            </button>
                            <button
                              className="text-xs text-gray-600 hover:text-gray-900"
                              onClick={async () => {
                                const to = Math.min((col.cards?.length || 1) - 1, (card.position ?? idx) + 1);
                                if (to === idx) return;
                                try {
                                  await boardsAPI.moveCard(card.id, { toColumnId: col.id, toIndex: to });
                                  setBoard((prev) => {
                                    if (!prev) return prev;
                                    const copy: FullBoard = JSON.parse(JSON.stringify(prev));
                                    const targetCol = copy.columns.find((c) => c.id === col.id);
                                    if (!targetCol) return prev;
                                    const fromIdx = (targetCol.cards || []).findIndex((c) => c.id === card.id);
                                    const [moving] = targetCol.cards.splice(fromIdx, 1);
                                    targetCol.cards.splice(to, 0, moving);
                                    targetCol.cards.forEach((c, i) => (c.position = i));
                                    return copy;
                                  });
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : "Move failed");
                                }
                              }}
                              aria-label="Move down"
                            >
                              ↓
                            </button>
                            <button
                              className="text-xs text-gray-600 hover:text-gray-900"
                              onClick={async () => {
                                const all = board.columns;
                                const colIdx = all.findIndex((c) => c.id === col.id);
                                if (colIdx < 0) return;
                                const nextCol = all[colIdx + 1];
                                if (!nextCol) return;
                                try {
                                  await boardsAPI.moveCard(card.id, { toColumnId: nextCol.id, toIndex: (nextCol.cards?.length ?? 0) });
                                  setBoard((prev) => {
                                    if (!prev) return prev;
                                    const copy: FullBoard = JSON.parse(JSON.stringify(prev));
                                    const from = copy.columns.find((c) => c.id === col.id);
                                    const toC = copy.columns.find((c) => c.id === nextCol.id);
                                    if (!from || !toC) return prev;
                                    const fromIdx = (from.cards || []).findIndex((c) => c.id === card.id);
                                    const [moving] = from.cards.splice(fromIdx, 1);
                                    moving.column_id = nextCol.id;
                                    toC.cards.splice((toC.cards?.length ?? 0), 0, moving);
                                    from.cards.forEach((c, i) => (c.position = i));
                                    toC.cards.forEach((c, i) => (c.position = i));
                                    return copy;
                                  });
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : "Move failed");
                                }
                              }}
                              aria-label="Move to next column"
                            >
                              ▶
                            </button>
                            <button
                              className="text-xs text-red-600 hover:text-red-700"
                              onClick={async () => {
                                try {
                                  await boardsAPI.deleteCard(card.id);
                                  setBoard((prev) => {
                                    if (!prev) return prev;
                                    const copy: FullBoard = JSON.parse(JSON.stringify(prev));
                                    const column = copy.columns.find((c) => c.id === col.id);
                                    if (!column) return prev;
                                    column.cards = (column.cards || []).filter((c) => c.id !== card.id);
                                    return copy;
                                  });
                                } catch (e) {
                                  const msg = e instanceof Error ? e.message : "Failed to delete card";
                                  toast.error(msg);
                                }
                              }}
                              aria-label={`Delete card ${card.title}`}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        {/* Priority chips */}
                        <div className="mt-2 flex items-center gap-2">
                          {hasPriority(card.labels, "high") && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">● High</span>
                          )}
                          {hasPriority(card.labels, "medium") && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">● Medium</span>
                          )}
                          {hasPriority(card.labels, "low") && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">● Low</span>
                          )}
                          <select
                            aria-label={`Change priority for ${card.title}`}
                            className="ml-auto border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-xs bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
                            value={hasPriority(card.labels, "high") ? "high" : hasPriority(card.labels, "medium") ? "medium" : hasPriority(card.labels, "low") ? "low" : "none"}
                            onChange={async (e) => {
                              const val = e.target.value as "none" | "high" | "medium" | "low";
                              const newLabels = [
                                ...(card.labels || []).filter((l) => !/^prio-/.test(l.toLowerCase())),
                                ...(val !== "none" ? [`prio-${val}`] : []),
                              ];
                              try {
                                const res = await boardsAPI.updateCard(card.id, { labels: newLabels, version: card.version ?? 0 });
                                setBoard((prev) => {
                                  if (!prev) return prev;
                                  const copy: FullBoard = JSON.parse(JSON.stringify(prev));
                                  const columnRef = copy.columns.find((c) => c.id === col.id);
                                  if (!columnRef) return prev;
                                  const c = columnRef.cards.find((x) => x.id === card.id);
                                  if (c) {
                                    c.labels = (res.data?.labels || newLabels);
                                    c.version = (res.data?.version ?? (card.version ?? 0));
                                  }
                                  return copy;
                                });
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Update failed");
                              }
                            }}
                          >
                            <option value="none">No priority</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          {card.due_date && (<span className="px-2 py-0.5 rounded bg-gray-100">Due: {new Date(card.due_date).toLocaleDateString()}</span>)}
                          {card.assignee_id && (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-semibold">
                              {card.assignee_id.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        {card.description && (
                          <div className="text-sm text-gray-600 mt-1 line-clamp-3">{card.description}</div>
                        )}
                      </div>
                    ))}
                </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default BoardPage;


