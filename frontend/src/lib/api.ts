import axios from "axios";

// In dev, route through Vite proxy to avoid CORS; in prod, allow override
// Prefer explicit API URL if provided; fall back to Vite proxy '/api'
const API_BASE_URL = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env.VITE_API_URL || "/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post("/auth/register", data),

  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),

  getProfile: () => api.get("/auth/profile"),

  updateProfile: (data: { username?: string; email?: string }) =>
    api.put("/auth/profile", data),

  getUserByUsername: (username: string) => api.get(`/auth/user/${username}`),

  verifyToken: () => api.get("/auth/verify"),
};

// Auctions API
// Deprecated: auctions/bids/counter-offers removed for Kanban migration

// Kanban Boards API
export const boardsAPI = {
  create: (data: { title: string; description?: string }) =>
    api.post("/boards", data),

  // Optional: list boards (if backend exposes it). Kept typed as any to avoid build errors when absent.
  list: () => api.get("/boards"),

  get: (id: string) => api.get(`/boards/${id}`),

  delete: (id: string) => api.delete(`/boards/${id}`),

  createColumn: (data: { boardId: string; title: string; position?: number }) =>
    api.post(`/columns`, data),

  deleteColumn: (id: string) => api.delete(`/columns/${id}`),

  createCard: (
    boardId: string,
    data: {
      columnId: string;
      title: string;
      description?: string | null;
      assigneeId?: string | null;
      labels?: string[];
      dueDate?: string | null;
      position?: number;
    }
  ) => api.post(`/cards`, { boardId, ...data }),

  updateCard: (
    id: string,
    data: { title?: string; description?: string | null; assigneeId?: string | null; labels?: string[]; due_date?: string | null; version?: number }
  ) => api.patch(`/cards/${id}`, data),

  moveCard: (
    id: string,
    data: { toColumnId: string; toIndex: number; version?: number }
  ) => api.post(`/cards/${id}/move`, data),

  deleteCard: (id: string) => api.delete(`/cards/${id}`),

  // Teams
  addMember: (boardId: string, data: { userId: string; role: "owner" | "editor" | "viewer" }) =>
    api.post(`/boards/${boardId}/members`, data),
  removeMember: (boardId: string, data: { userId: string }) =>
    api.delete(`/boards/${boardId}/members`, { data }),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params?: { limit?: number; offset?: number; unread?: boolean }) =>
    api.get("/notifications", { params }),

  getUnreadCount: () => api.get("/notifications/unread-count"),

  markAsRead: (id: number) => api.put(`/notifications/${id}/read`),

  markAllAsRead: () => api.put("/notifications/mark-all-read"),

  delete: (id: number) => api.delete(`/notifications/${id}`),
};

export default api;
