// Fresh notification system using socket.io-client
import { io, Socket } from "socket.io-client";

interface AuditEvent {
  boardId: string;
  actorId: string | null;
  eventType: string;
  data: Record<string, any>;
  timestamp: string;
}

class NotificationManager {
  private socket: Socket | null = null;
  private listeners: Map<string, (event: AuditEvent) => void> = new Map();
  private isConnected = false;
  private currentBoardId: string | null = null;

  getSocket() {
    return this.socket;
  }

  constructor() {
    this.connect();
  }

  private connect() {
    // Determine the correct backend URL
    let backendUrl = import.meta.env.VITE_API_URL || 
                    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                      ? "http://localhost:5000" 
                      : window.location.origin);
    
    // Remove /api suffix if present for socket connection
    if (backendUrl.endsWith('/api')) {
      backendUrl = backendUrl.slice(0, -4);
    }
    
    console.log(`[NotificationManager] Connecting to: ${backendUrl}`);
    
    this.socket = io(backendUrl, {
      path: "/ws",
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.socket.on("connect", () => {
      console.log("[NotificationManager] Connected to backend");
      this.isConnected = true;
      // Re-join board if we were previously in one
      if (this.currentBoardId) {
        this.joinBoard(this.currentBoardId, '');
      }
    });

    this.socket.on("disconnect", () => {
      console.log("[NotificationManager] Disconnected from backend");
      this.isConnected = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error("[NotificationManager] Connection error:", error);
    });

    this.socket.on("audit:log", (event: AuditEvent) => {
      console.log("[NotificationManager] Received audit event:", event);
      this.notifyListeners(event);
    });
  }

  joinBoard(boardId: string, userId: string) {
    if (this.currentBoardId === boardId && this.isConnected) return;
    
    console.log(`[NotificationManager] Joining board: ${boardId}`);
    this.currentBoardId = boardId;
    
    if (this.socket) {
      if (!this.socket.connected) {
        console.log('[NotificationManager] Socket not connected, waiting for connection...');
        const connectHandler = () => {
          console.log('[NotificationManager] Socket connected, joining board...');
          this.socket?.emit('join_board', { boardId, userId });
          this.socket?.off('connect', connectHandler);
        };
        this.socket.on('connect', connectHandler);
        this.socket.connect();
      } else {
        this.socket.emit('join_board', { boardId, userId });
      }
    }
  }

  leaveBoard(boardId: string, userId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit("leave_board", { boardId, userId });
    }
  }

  addListener(id: string, callback: (event: AuditEvent) => void) {
    console.log(`[NotificationManager] Adding listener: ${id}`);
    this.listeners.set(id, callback);
    
    // Return cleanup function
    return () => {
      this.removeListener(id);
    };
  }

  removeListener(id: string) {
    this.listeners.delete(id);
  }

  private notifyListeners(event: AuditEvent) {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("[NotificationManager] Error in listener:", error);
      }
    });
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();
