export interface LocalNotification {
  id: string;
  message: string;
  createdAt: number;
  read?: boolean;
}

type Listener = (items: LocalNotification[]) => void;

const listeners: Listener[] = [];
let items: LocalNotification[] = [];

export function subscribe(fn: Listener) {
  listeners.push(fn);
  fn(items);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function emit() {
  for (const fn of listeners) fn(items);
}

export function add(message: string) {
  const n: LocalNotification = {
    id: Math.random().toString(36).slice(2),
    message,
    createdAt: Date.now(),
    read: false,
  };
  items = [n, ...items].slice(0, 50);
  emit();
}

export function markAllRead() {
  items = items.map((n) => ({ ...n, read: true }));
  emit();
}

export function remove(id: string) {
  items = items.filter((n) => n.id !== id);
  emit();
}

export function getUnreadCount() {
  return items.filter((n) => !n.read).length;
}

export function getAll() {
  return items;
}





