import React, { useEffect, useRef, useState } from "react";
import { notificationsAPI } from "../../lib/api";
import * as localStore from "./store";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

interface NotificationItem {
  id: number; // negative ids reserved for local items
  type: "server" | "local";
  message: string;
  created_at: string;
  read?: boolean;
}

export const NotificationsDropdown: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  const syncUnread = async () => {
    try {
      const res = await notificationsAPI.getUnreadCount();
      setUnread(res.data?.count ?? 0);
    } catch {}
  };

  const load = async () => {
    try {
      setLoading(true);
      let server: NotificationItem[] = [];
      try {
        const res = await notificationsAPI.getAll({ limit: 20 });
        server = (res.data || []).map((n: any) => ({
          id: n.id,
          type: "server",
          message: n.message,
          created_at: n.created_at,
          read: !!n.read,
        }));
      } catch {
        // server feed optional; proceed with local only
      }
      const localList = localStore.getAll().map((n, idx) => ({
        id: -1000 - idx,
        type: "local" as const,
        message: n.message,
        created_at: new Date(n.createdAt).toISOString(),
        read: !!n.read,
      }));
      setItems([...localList, ...server]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncUnread();
    const unsub = localStore.subscribe((list) => {
      // merge into current items (preserve server items)
      setItems((prev) => {
        const server = prev.filter((n) => n.type === "server");
        const localList = list.map((n, idx) => ({
          id: -1000 - idx,
          type: "local" as const,
          message: n.message,
          created_at: new Date(n.createdAt).toISOString(),
          read: !!n.read,
        }));
        return [...localList, ...server];
      });
      setUnread(localStore.getUnreadCount());
    });
    return unsub;
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
    }
  };

  const handleMarkAll = async () => {
    try { await notificationsAPI.markAllAsRead(); } catch {}
    localStore.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const handleDelete = async (id: number) => {
    await notificationsAPI.delete(id);
    setItems((prev) => prev.filter((n) => n.id !== id));
    syncUnread();
  };

  return (
    <div className="relative" ref={ref}>
      <button className="relative" onClick={toggle} aria-label="Notifications">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
            <div className="font-semibold text-gray-900">Notifications</div>
            <button
              className="text-xs text-gray-600 hover:text-gray-800 inline-flex items-center gap-1"
              onClick={handleMarkAll}
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-500">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notifications</div>
            ) : (
              items.map((n) => (
                <div key={n.id} className="px-3 py-2 border-b border-gray-100 last:border-b-0 flex items-start gap-2">
                  <div className={`mt-1 w-2 h-2 rounded-full ${n.read ? "bg-gray-300" : "bg-blue-500"}`} />
                  <div className="flex-1">
                    <div className="text-sm text-gray-800">{n.message}</div>
                    <div className="text-[11px] text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  {n.type === "server" && (
                    <button className="text-gray-500 hover:text-red-600" onClick={() => handleDelete(n.id)} aria-label="Delete notification">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;



