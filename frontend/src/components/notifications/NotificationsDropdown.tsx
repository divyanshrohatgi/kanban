// import React, { useEffect, useRef, useState } from "react";
// import { notificationsAPI } from "../../lib/api";
// import * as localStore from "./store";
// import { Bell, CheckCheck, Trash2 } from "lucide-react";
// import { io } from "socket.io-client";
// import { useAuth } from "../../contexts/AuthContext";

// interface NotificationItem {
//   id: number; // negative ids reserved for local items
//   type: "server" | "local";
//   message: string;
//   created_at: string;
//   read?: boolean;
// }

// export const NotificationsDropdown: React.FC = () => {
//   const { user } = useAuth();
//   const [open, setOpen] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [items, setItems] = useState<NotificationItem[]>([]);
//   const [unread, setUnread] = useState(0);
//   const ref = useRef<HTMLDivElement | null>(null);
//   const [socket, setSocket] = useState<any>(null);

//   const syncUnread = async () => {
//     try {
//       const res = await notificationsAPI.getUnreadCount();
//       setUnread(res.data?.count ?? 0);
//     } catch {}
//   };

//   const load = async () => {
//     try {
//       setLoading(true);
//       let server: NotificationItem[] = [];
//       try {
//         const res = await notificationsAPI.getAll({ limit: 20 });
//         server = (res.data || []).map((n: any) => ({
//           id: n.id,
//           type: "server",
//           message: n.message,
//           created_at: n.created_at,
//           read: !!n.read,
//         }));
//       } catch {
//         // server feed optional; proceed with local only
//       }
//       const localList = localStore.getAll().map((n, idx) => ({
//         id: -1000 - idx,
//         type: "local" as const,
//         message: n.message,
//         created_at: new Date(n.createdAt).toISOString(),
//         read: !!n.read,
//       }));
//       setItems([...localList, ...server]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     // Initialize socket connection
//     const newSocket = io("/ws", {
//       path: "/ws",
//       transports: ["websocket", "polling"],
//     });
//     setSocket(newSocket);

//     syncUnread();
//     const unsub = localStore.subscribe((list) => {
//       // merge into current items (preserve server items)
//       setItems((prev) => {
//         const server = prev.filter((n) => n.type === "server");
//         const localList = list.map((n, idx) => ({
//           id: -1000 - idx,
//           type: "local" as const,
//           message: n.message,
//           created_at: new Date(n.createdAt).toISOString(),
//           read: !!n.read,
//         }));
//         return [...localList, ...server];
//       });
//       setUnread(localStore.getUnreadCount());
//     });

//     // Set up real-time notification updates
//     newSocket.on("connect", () => {
//       console.log("Notifications: Connected to WebSocket");
//       if (user?.id) {
//         newSocket.emit("join_notifications", { userId: user.id });
//       }
//     });

//     // Listen for notification events
//     newSocket.on("notification:new", () => {
//       console.log("New notification received via WebSocket");
//       syncUnread();
//       if (open) {
//         load(); // Reload notifications if dropdown is open
//       }
//     });

//     return () => {
//       unsub();
//       newSocket.disconnect();
//     };
//   }, [open]);

//   useEffect(() => {
//     const onDoc = (e: MouseEvent) => {
//       if (!ref.current) return;
//       if (!ref.current.contains(e.target as Node)) setOpen(false);
//     };
//     document.addEventListener("mousedown", onDoc);
//     return () => document.removeEventListener("mousedown", onDoc);
//   }, []);

//   const toggle = async () => {
//     const next = !open;
//     setOpen(next);
//     if (next) {
//       await load();
//     }
//   };

//   const handleMarkAll = async () => {
//     try { await notificationsAPI.markAllAsRead(); } catch {}
//     localStore.markAllRead();
//     setItems((prev) => prev.map((n) => ({ ...n, read: true })));
//     setUnread(0);
//   };

//   const handleDelete = async (id: number) => {
//     await notificationsAPI.delete(id);
//     setItems((prev) => prev.filter((n) => n.id !== id));
//     syncUnread();
//   };

//   return (
//     <div className="relative" ref={ref}>
//       <button 
//         className="relative p-2 rounded-md hover:bg-gray-700/50 transition-all duration-200 group" 
//         onClick={toggle} 
//         aria-label="Notifications"
//       >
//         <Bell className="w-5 h-5 text-white/90 group-hover:text-white transition-colors" />
//         {unread > 0 && (
//           <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] px-1 text-white font-semibold animate-pulse">
//             {unread > 9 ? "9+" : unread}
//           </span>
//         )}
//       </button>
//       {open && (
//         <div className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-xl z-50 animate-in slide-in-from-top-2 duration-200">
//           <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
//             <div className="font-semibold text-gray-900">Notifications</div>
//             <button
//               className="text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-all duration-200 inline-flex items-center gap-1"
//               onClick={handleMarkAll}
//             >
//               <CheckCheck className="w-4 h-4" /> Mark all read
//             </button>
//           </div>
//           <div className="max-h-80 overflow-y-auto">
//             {loading ? (
//               <div className="p-6 text-sm text-gray-500 text-center">
//                 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
//                 Loading notifications...
//               </div>
//             ) : items.length === 0 ? (
//               <div className="p-6 text-sm text-gray-500 text-center">
//                 <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
//                 No notifications yet
//               </div>
//             ) : (
//               items.map((n) => (
//                 <div key={n.id} className="px-4 py-3 border-b border-gray-100 last:border-b-0 flex items-start gap-3 hover:bg-gray-50 transition-colors">
//                   <div className={`mt-1.5 w-2.5 h-2.5 rounded-full ${n.read ? "bg-gray-300" : "bg-blue-500 animate-pulse"}`} />
//                   <div className="flex-1 min-w-0">
//                     <div className="text-sm text-gray-800 leading-relaxed">{n.message}</div>
//                     <div className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
//                   </div>
//                   {n.type === "server" && (
//                     <button 
//                       className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition-all duration-200 flex-shrink-0" 
//                       onClick={() => handleDelete(n.id)} 
//                       aria-label="Delete notification"
//                     >
//                       <Trash2 className="w-4 h-4" />
//                     </button>
//                   )}
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default NotificationsDropdown;

import React, { useEffect, useRef, useState } from "react";
import { notificationsAPI } from "../../lib/api";
import * as localStore from "./store";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { notificationManager } from "../../lib/notifications";

interface NotificationItem {
  id: number;
  type: "server" | "local";
  message: string;
  created_at: string;
  read?: boolean;
}

export const NotificationsDropdown: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // keep track of dropdown state without reinitializing socket
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const syncUnread = async () => {
    try {
      const res = await notificationsAPI.getUnreadCount();
      const serverCount = res.data?.count ?? 0;
      const localCount = localStore.getUnreadCount?.() ?? 0;
      setUnread(serverCount + localCount);
    } catch {
      setUnread(localStore.getUnreadCount?.() ?? 0);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      let server: NotificationItem[] = [];
      try {
        const res = await notificationsAPI.getAll({ limit: 20 });
        server = (res.data || []).map((n: any) => ({
          id: n.id,
          type: "server" as const,
          message: n.message,
          created_at: n.created_at,
          read: !!n.read,
        }));
      } catch {
        // server feed optional; fallback to local only
      }
      const localList = (localStore.getAll?.() ?? []).map((n: any, idx: number) => ({
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

  // Socket setup using new notification manager
  useEffect(() => {
    const listenerId = `notifications-dropdown-${user?.id}`;

    const handleNotification = () => {
      void syncUnread();
      if (openRef.current) void load();
    };

    notificationManager.addListener(listenerId, handleNotification);

    // initial fetch
    void syncUnread();

    return () => {
      notificationManager.removeListener(listenerId);
    };
  }, [user?.id]);

  // outside click close
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) await load();
  };

  const handleMarkAll = async () => {
    try {
      await notificationsAPI.markAllAsRead();
    } catch {}
    localStore.markAllRead?.();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    void syncUnread();
  };

  const handleDelete = async (id: number) => {
    try {
      await notificationsAPI.delete(id);
    } catch {}
    setItems((prev) => prev.filter((n) => n.id !== id));
    void syncUnread();
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="relative p-2 rounded-md hover:bg-gray-700/50 transition-all duration-200 group"
        onClick={toggle}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-white/90 group-hover:text-white transition-colors" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] px-1 text-white font-semibold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="font-semibold text-gray-900">Notifications</div>
            <button
              className="text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md inline-flex items-center gap-1"
              onClick={handleMarkAll}
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-sm text-gray-500 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Loading notifications...
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-sm text-gray-500 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                No notifications yet
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b border-gray-100 last:border-b-0 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`mt-1.5 w-2.5 h-2.5 rounded-full ${
                      n.read ? "bg-gray-300" : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 leading-relaxed">{n.message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                  {n.type === "server" && (
                    <button
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition-all duration-200 flex-shrink-0"
                      onClick={() => handleDelete(n.id)}
                      aria-label="Delete notification"
                    >
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


