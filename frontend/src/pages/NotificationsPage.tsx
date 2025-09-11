import React, { useEffect, useState } from "react";
import { notificationsAPI } from "../lib/api";
import * as localStore from "../components/notifications/store";

interface BackendNotification {
  id: number;
  message: string;
  created_at: string;
  read?: boolean;
}

export const NotificationsPage: React.FC = () => {
  const [backendItems, setBackendItems] = useState<BackendNotification[]>([]);
  const [localItems, setLocalItems] = useState(localStore.getAll());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await notificationsAPI.getAll({ limit: 50 });
      setBackendItems(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsub = localStore.subscribe((items) => setLocalItems(items));
    return unsub;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Notifications</h1>
        {loading ? (
          <div className="p-4 text-gray-600">Loading...</div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Live (local)</h2>
              <div className="bg-white border border-gray-200 rounded-lg divide-y">
                {localItems.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No live notifications</div>
                ) : (
                  localItems.map((n) => (
                    <div key={n.id} className="p-3 text-sm text-gray-800 flex items-center justify-between">
                      <div>{n.message}</div>
                      <div className="text-[11px] text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Server</h2>
              <div className="bg-white border border-gray-200 rounded-lg divide-y">
                {backendItems.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No server notifications</div>
                ) : (
                  backendItems.map((n) => (
                    <div key={n.id} className="p-3 text-sm text-gray-800 flex items-center justify-between">
                      <div>{n.message}</div>
                      <div className="text-[11px] text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;





