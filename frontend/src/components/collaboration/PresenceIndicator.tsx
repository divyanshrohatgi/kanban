import React, { useEffect, useState } from "react";
import { notificationManager } from "../../lib/notifications";
import { Users, Circle } from "lucide-react";

interface User {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
}

interface PresenceIndicatorProps {
  boardId: string;
  currentUserId: string;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ 
  boardId, 
  currentUserId 
}) => {
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  useEffect(() => {
    // Listen for presence updates
    const handlePresenceUpdate = (data: { users: User[] }) => {
      setOnlineUsers(data.users.filter(user => user.id !== currentUserId));
    };

    // Add socket event listeners for presence
    const socket = notificationManager.getSocket();
    if (socket) {
      socket.on('presence:update', handlePresenceUpdate);
      socket.on('user:joined', (user: User) => {
        if (user.id !== currentUserId) {
          setOnlineUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
        }
      });
      socket.on('user:left', (userId: string) => {
        setOnlineUsers(prev => prev.filter(u => u.id !== userId));
      });
    }

    return () => {
      const socket = notificationManager.getSocket();
      if (socket) {
        socket.off('presence:update', handlePresenceUpdate);
        socket.off('user:joined');
        socket.off('user:left');
      }
    };
  }, [boardId, currentUserId]);

  if (onlineUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2">
      <Users className="w-4 h-4 text-gray-500" />
      <div className="flex items-center gap-1">
        {onlineUsers.slice(0, 3).map((user) => (
          <div
            key={user.id}
            className="relative"
            title={user.name || user.email || `User ${user.id.slice(0, 8)}`}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'User'}
                className="w-6 h-6 rounded-full border-2 border-white"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-green-500 fill-current" />
          </div>
        ))}
        {onlineUsers.length > 3 && (
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
            +{onlineUsers.length - 3}
          </div>
        )}
      </div>
      <span className="text-sm text-gray-600">
        {onlineUsers.length} online
      </span>
    </div>
  );
};
