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

  constructor() {
    this.connect();
  }

  private connect() {
    // Connect directly to backend port
    this.socket = io("http://localhost:5000", {
      path: "/ws",
      transports: ["polling"],
      withCredentials: true,
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      console.log("[NotificationManager] Connected to backend");
      this.isConnected = true;
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
    if (this.currentBoardId === boardId) return;
    
    console.log(`[NotificationManager] Joining board: ${boardId}`);
    this.currentBoardId = boardId;
    this.socket?.emit('join_board', { boardId, userId });
  }

  leaveBoard(boardId: string, userId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit("leave_board", { boardId, userId });
    }
  }

  addListener(id: string, callback: (event: AuditEvent) => void) {
    this.listeners.set(id, callback);
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
