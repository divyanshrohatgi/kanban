import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { boardsAPI, authAPI } from "../../lib/api";

export interface BoardMember {
  user_id: string;
  role: "owner" | "editor" | "viewer";
  username?: string;
}

interface Props {
  boardId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: BoardMember[];
  canManage: boolean; // owner only
  onMembersChange?: (next: BoardMember[]) => void;
}

export const TeamDialog: React.FC<Props> = ({ boardId, open, onOpenChange, members, canManage, onMembersChange }) => {
  const [list, setList] = useState<BoardMember[]>(members);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setList(members);
  }, [members]);

  const invite = async () => {
    try {
      setError("");
      setLoading(true);
      // Fetch by username; fall back to treating input as ID if not found
      let userId = "";
      try {
        const res = await authAPI.getUserByUsername(username.trim());
        userId = res.data?.id || res.data?.user?.id || "";
      } catch {
        userId = username.trim();
      }
      if (!userId) throw new Error("User not found");
      await boardsAPI.addMember(boardId, { userId, role });
      const next = [...list, { user_id: userId, role }];
      setList(next);
      onMembersChange?.(next);
      setUsername("");
      setRole("editor");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (userId: string) => {
    try {
      setLoading(true);
      await boardsAPI.removeMember(boardId, { userId });
      const next = list.filter((m) => m.user_id !== userId);
      setList(next);
      onMembersChange?.(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Team</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="space-y-2">
            <div className="text-sm font-medium">Members</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {list.length === 0 ? (
                <div className="text-sm text-gray-500">No members yet</div>
              ) : (
                list.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2">
                    <div className="text-sm">
                      <span className="font-medium">{m.username || m.user_id}</span>
                      <span className="ml-2 text-gray-600">{m.role}</span>
                    </div>
                    {canManage && m.role !== "owner" && (
                      <Button size="sm" variant="outline" onClick={() => remove(m.user_id)} disabled={loading}>Remove</Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {canManage && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Invite</div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Username or User ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <select
                  className="border border-gray-200 rounded-md px-2 py-2 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button onClick={invite} disabled={loading || !username.trim()}>Invite</Button>
              </div>
              <div className="text-xs text-gray-500">Owners can manage members. Use username if possible, otherwise paste user ID.</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamDialog;



