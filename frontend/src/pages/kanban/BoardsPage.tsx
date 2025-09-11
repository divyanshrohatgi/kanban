import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { boardsAPI } from "../../lib/api";
import { formatDistanceToNow } from "date-fns";

interface BoardSummary {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export const BoardsPage: React.FC = () => {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [title, setTitle] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const res = await boardsAPI.list();
      const data = res?.data as any;
      const list: BoardSummary[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.boards)
        ? data.boards
        : [];
      setBoards(list);
    } catch (e) {
      setBoards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      setCreating(true);
      const res = await boardsAPI.create({ title: title.trim() });
      const board = res.data;
      setTitle("");
      setBoards([board, ...boards]);
    } catch (e) {
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Boards</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8 flex gap-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New board title"
          />
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? "Creating..." : "Create Board"}
          </Button>
        </div>

        {boards.length === 0 ? (
          <div className="text-center text-gray-600">No boards yet</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((b) => (
              <div
                key={b.id}
                className="group bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <Link
                    to={`/boards/${b.id}`}
                    className="font-semibold text-gray-900 group-hover:text-blue-600"
                  >
                    {b.title}
                  </Link>
                  <button
                    className="text-xs text-red-600 hover:text-red-700"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!confirm("Delete this board? This cannot be undone.")) return;
                      try {
                        await boardsAPI.delete(b.id);
                        setBoards((prev) => prev.filter((x) => x.id !== b.id));
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
                {b.description && (
                  <div className="text-sm text-gray-600 mt-1 line-clamp-2">{b.description}</div>
                )}
                <div className="mt-4 text-xs text-gray-500 flex items-center justify-between">
                  <span>Created {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</span>
                  {b.updated_at && (
                    <span>Updated {formatDistanceToNow(new Date(b.updated_at), { addSuffix: true })}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardsPage;


