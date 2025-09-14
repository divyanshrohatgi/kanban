import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { boardsAPI } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Plus, Edit3, Trash2, Calendar, User, X } from "lucide-react";
import { toast } from "sonner";
import { ActivityPanel } from "../../components/notifications/ActivityPanel";
import { TeamDialog } from "../../components/kanban/TeamDialog";
import { useAuth } from "../../contexts/AuthContext";
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
  created_at: string;
  updated_at: string;
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
  board_members?: Array<{
    user_id: string;
    role: "owner" | "editor" | "viewer";
    username?: string;
  }>;
}

const BoardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [board, setBoard] = useState<FullBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");
  const [activeUsers] = useState<any[]>([]);
  const [draggingCardId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [addingCardToColumn, setAddingCardToColumn] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // Sanitize id in case it contains accidental "id:" prefix
  const sanitizedId = (id || "").replace(/^id:\s*/i, "").trim();

  const hasPriority = (labels?: string[], level?: "high" | "medium" | "low") => {
    if (!labels || !labels.length) return false;
    return labels.some((l) => l.toLowerCase() === `prio-${level}`);
  };

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
        normalizedColumns.sort((a, b) => a.position - b.position);
        setBoard({ id: raw.id, title: raw.title, columns: normalizedColumns, board_members: raw.board_members });
      } catch (err: any) {
        console.error("Failed to fetch board:", err);
        setError(err?.response?.data?.message || "Failed to load board");
      } finally {
        setLoading(false);
      }
    };
    if (sanitizedId) fetch();
  }, [sanitizedId]);

  const addColumn = async () => {
    if (!newColumnTitle.trim() || !board) return;
    try {
      setIsAddingColumn(true);
      const res = await boardsAPI.createColumn({ 
        boardId: board.id,
        title: newColumnTitle.trim(),
        position: board.columns.length 
      });
      const newCol: Column = { id: res.data.id, title: res.data.title, position: res.data.position ?? board.columns.length, cards: [] };
      setBoard((prev) => (prev ? { ...prev, columns: [...prev.columns, newCol] } : null));
      setNewColumnTitle("");
      toast.success("Column added");
      localNotifs.add(`Column created: ${newCol.title}`);
    } catch (err: any) {
      console.error("Failed to add column:", err);
      toast.error(err?.response?.data?.message || "Failed to add column");
    } finally {
      setIsAddingColumn(false);
    }
  };

  const updateColumn = async (columnId: string, title: string) => {
    if (!title.trim()) return;
    try {
      await fetch(`/api/columns/${columnId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ title: title.trim() })
      });
      setBoard((prev) => prev ? { ...prev, columns: prev.columns.map((c) => (c.id === columnId ? { ...c, title: title.trim() } : c)) } : null);
      toast.success("Column updated");
      localNotifs.add("Column updated");
    } catch (err: any) {
      console.error("Failed to update column:", err);
      toast.error("Failed to update column");
    }
  };

  const deleteColumn = async (columnId: string) => {
    if (!confirm("Are you sure you want to delete this column? All cards in it will be deleted.")) return;
    try {
      await boardsAPI.deleteColumn(columnId);
      setBoard((prev) => prev ? { ...prev, columns: prev.columns.filter((c) => c.id !== columnId) } : null);
      toast.success("Column deleted");
      localNotifs.add("Column deleted");
    } catch (err: any) {
      console.error("Failed to delete column:", err);
      toast.error(err?.response?.data?.message || "Failed to delete column");
    }
  };

  const addCard = async (columnId: string) => {
    if (!newCardTitle.trim() || !board) return;
    try {
      const res = await boardsAPI.createCard(board.id, {
        columnId: columnId,
        title: newCardTitle.trim(),
        position: board.columns.find(c => c.id === columnId)?.cards.length || 0
      });
      const newCard = res.data;
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => {
            if (col.id === columnId) {
              return { ...col, cards: [...col.cards, newCard] };
            }
            return col;
          }),
        };
      });
      setNewCardTitle("");
      setAddingCardToColumn(null);
      toast.success("Card created");
      localNotifs.add("Card created");
    } catch (err: any) {
      console.error("Failed to add card:", err);
      toast.error(err?.response?.data?.message || "Failed to add card");
    }
  };

  const updateCard = async (cardId: string, updates: Partial<Card>) => {
    try {
      // Find the current card to get its version
      const currentCard = board?.columns
        .flatMap(col => col.cards)
        .find(card => card.id === cardId);
      
      const payload = {
        title: updates.title,
        description: updates.description || null,
        dueDate: updates.due_date,
        version: currentCard?.version || 1
      };
      
      await boardsAPI.updateCard(cardId, payload);
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) => (c.id === cardId ? { ...c, ...updates, version: (c.version || 1) + 1 } : c)),
          })),
        };
      });
      toast.success("Card updated");
      localNotifs.add("Card updated");
    } catch (err: any) {
      console.error("Failed to update card:", err);
      toast.error(err?.response?.data?.message || "Failed to update card");
    }
  };

  const deleteCard = async (cardId: string) => {
    if (!confirm("Are you sure you want to delete this card?")) return;
    try {
      await boardsAPI.deleteCard(cardId);
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.filter((c) => c.id !== cardId),
          })),
        };
      });
      toast.success("Card deleted");
      localNotifs.add("Card deleted");
    } catch (err: any) {
      console.error("Failed to delete card:", err);
      toast.error(err?.response?.data?.message || "Failed to delete card");
    }
  };

  const CardModal = () => {
    if (!editingCard) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Edit Card</h2>
            <button
              onClick={() => setEditingCard(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={editingCard.title}
                onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                placeholder="Card title..."
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editingCard.description || ""}
                onChange={(e) => {
                  const newCard = { ...editingCard, description: e.target.value };
                  setEditingCard(newCard);
                }}
                placeholder="Add a description..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                rows={4}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={editingCard.due_date ? editingCard.due_date.split('T')[0] : ""}
                onChange={(e) => {
                  const newCard = { ...editingCard, due_date: e.target.value ? `${e.target.value}T00:00:00Z` : null };
                  setEditingCard(newCard);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  updateCard(editingCard.id, {
                    title: editingCard.title,
                    description: editingCard.description,
                    due_date: editingCard.due_date
                  });
                  setEditingCard(null);
                }}
                className="flex-1"
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingCard(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>;
  if (!board) return <div className="flex items-center justify-center h-screen">Board not found</div>;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-6 py-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">{board.title.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{board.title}</h1>
                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{board.board_members?.length || 0} members</span>
                  </div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live collaboration</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Active Users */}
            {activeUsers.length > 0 && (
              <div className="flex items-center gap-3 bg-white/60 rounded-full px-4 py-2 backdrop-blur-sm border border-gray-200/50">
                <span className="text-sm font-medium text-gray-700">Active:</span>
                <div className="flex -space-x-2">
                  {activeUsers.slice(0, 5).map((u) => (
                    <div key={u.id} className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold border-3 border-white shadow-lg ring-2 ring-blue-100 hover:scale-110 transition-transform" title={u.username || u.id}>
                      {(u.username || u.id).charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {activeUsers.length > 5 && (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-bold border-3 border-white shadow-lg">
                      +{activeUsers.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
            <TeamDialog 
              boardId={board.id} 
              members={board.board_members || []} 
              open={false}
              onOpenChange={() => {}}
              canManage={true}
            />
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto p-8">
        <div className="flex gap-8 min-w-max pb-8">
          {/* Columns */}
          {board.columns.map((column) => (
            <div key={column.id} className="w-80 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 flex flex-col hover:shadow-2xl transition-all duration-300">
              {/* Column Header */}
              <div className="p-5 border-b border-gray-100/50">
                <div className="flex items-center justify-between">
                  {editingColumnId === column.id ? (
                    <input
                      type="text"
                      value={editingColumnTitle}
                      onChange={(e) => setEditingColumnTitle(e.target.value)}
                      onBlur={() => {
                        if (editingColumnTitle.trim()) {
                          updateColumn(column.id, editingColumnTitle);
                        }
                        setEditingColumnId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (editingColumnTitle.trim()) {
                            updateColumn(column.id, editingColumnTitle);
                          }
                          setEditingColumnId(null);
                        }
                        if (e.key === "Escape") {
                          setEditingColumnId(null);
                        }
                      }}
                      autoFocus
                      className="text-lg font-bold bg-transparent border-none outline-none w-full text-gray-800"
                    />
                  ) : (
                    <h3
                      className="text-lg font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2 group"
                      onClick={() => {
                        setEditingColumnId(column.id);
                        setEditingColumnTitle(column.title);
                      }}
                    >
                      {column.title}
                      <Edit3 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                    </h3>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-sm rounded-full font-semibold shadow-sm">
                      {column.cards.length}
                    </span>
                    <button
                      onClick={() => deleteColumn(column.id)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all hover:scale-110"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Cards Container */}
              <div className="flex-1 p-5 space-y-4 min-h-[300px] max-h-[600px] overflow-y-auto custom-scrollbar">
                {column.cards.map((card) => (
                  <div
                    key={card.id}
                    className={`group p-5 bg-gradient-to-br from-white to-gray-50/50 rounded-xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:rotate-1 ${
                      draggingCardId === card.id ? "opacity-50 rotate-2 scale-95" : ""
                    }`}
                    onClick={() => setEditingCard(card)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 flex-1 leading-snug text-base">{card.title}</h4>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {card.labels && card.labels.length > 0 && (
                          <div className="flex gap-1">
                            {hasPriority(card.labels, "high") && <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-red-600 rounded-full shadow-sm" title="High Priority" />}
                            {hasPriority(card.labels, "medium") && <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-sm" title="Medium Priority" />}
                            {hasPriority(card.labels, "low") && <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-sm" title="Low Priority" />}
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCard(card.id);
                          }}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all hover:scale-110"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    {card.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">{card.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {card.due_date && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 rounded-full text-xs font-medium shadow-sm">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(card.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {card.assignee_id && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-xs font-medium shadow-sm">
                          <User className="w-3 h-3" />
                          <span>Assigned</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Add Card Button */}
                {addingCardToColumn === column.id ? (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-200 shadow-sm">
                    <input
                      type="text"
                      placeholder="Enter card title..."
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCardTitle.trim()) {
                          addCard(column.id);
                        }
                        if (e.key === "Escape") {
                          setAddingCardToColumn(null);
                          setNewCardTitle("");
                        }
                      }}
                      autoFocus
                      className="w-full p-3 border border-blue-200 rounded-lg text-sm bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          if (newCardTitle.trim()) {
                            addCard(column.id);
                          }
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-medium"
                      >
                        Add Card
                      </button>
                      <button
                        onClick={() => {
                          setAddingCardToColumn(null);
                          setNewCardTitle("");
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-all font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingCardToColumn(column.id)}
                    className="flex items-center gap-2 w-full p-4 text-gray-500 hover:text-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-300 transition-all group shadow-sm hover:shadow-md"
                  >
                    <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold">Add a card</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {/* Add Column */}
          <div className="w-80 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-dashed border-blue-200 flex flex-col hover:shadow-2xl transition-all duration-300">
            <div className="p-6 flex-1 flex items-center justify-center">
              {isAddingColumn ? (
                <div className="w-full space-y-4">
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    placeholder="Enter column title..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addColumn();
                      if (e.key === "Escape") {
                        setNewColumnTitle("");
                        setIsAddingColumn(false);
                      }
                    }}
                    autoFocus
                    className="w-full p-3 border border-blue-200 rounded-lg bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={addColumn}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                    >
                      Add Column
                    </button>
                    <button
                      onClick={() => {
                        setNewColumnTitle("");
                        setIsAddingColumn(false);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="w-full h-full min-h-[250px] text-gray-500 hover:text-blue-600 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all flex flex-col items-center justify-center gap-4 rounded-xl group"
                  onClick={() => setIsAddingColumn(true)}
                >
                  <Plus className="w-12 h-12 group-hover:scale-110 transition-transform" />
                  <span className="text-xl font-bold">Add Column</span>
                  <span className="text-sm text-gray-400">Click to create a new column</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Card Modal */}
      {editingCard && <CardModal />}
      
      {/* Activity Panel Component */}
      {user?.id && <ActivityPanel boardId={sanitizedId} userId={user.id} />}
    </div>
  );
};

export default BoardPage;
