import React, { useEffect, useState } from "react";
import { notificationManager } from "../../lib/notifications";
import { Activity, X, User, UserCheck, UserPlus, UserMinus, Edit, Trash2, Move, Settings, List, Plus } from "lucide-react";

interface AuditEvent {
  boardId: string;
  actorId: string | null;
  eventType: string;
  data: Record<string, any>;
  timestamp: string;
}

interface ActivityPanelProps {
  boardId: string;
  userId: string;
}

export const ActivityPanel: React.FC<ActivityPanelProps> = ({ boardId, userId }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const listenerId = `activity-panel-${boardId}`;
    
    // Handle connection state changes
    const handleConnect = () => {
      console.log("[ActivityPanel] Socket connected");
      setIsConnected(true);
      setConnectionError(null);
      notificationManager.joinBoard(boardId, userId);
    };
    
    const handleDisconnect = () => {
      console.log("[ActivityPanel] Socket disconnected");
      setIsConnected(false);
      setConnectionError("Disconnected from server. Reconnecting...");
    };
    
    const handleConnectError = (error: Error) => {
      console.error("[ActivityPanel] Connection error:", error);
      setConnectionError(`Connection error: ${error.message}`);
    };

    // Initial connection check
    setIsConnected(notificationManager.isSocketConnected());
    
    // Join board room when component mounts
    console.log("[ActivityPanel] Initializing, joining board:", boardId);
    notificationManager.joinBoard(boardId, userId);

    // Listen for audit events
    const handleAuditEvent = (event: AuditEvent) => {
      console.log("[ActivityPanel] Received event:", event);
      if (event.boardId === boardId) {
        console.log("[ActivityPanel] Adding event for board:", boardId, event);
        setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
      }
    };

    // Add socket event listeners
    const socket = notificationManager.getSocket();
    if (socket) {
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);
    }

    // Add our audit event listener
    const cleanupListener = notificationManager.addListener(listenerId, handleAuditEvent);

    // Initial load of recent events
    const loadInitialEvents = async () => {
      try {
        // You would typically fetch initial events from an API here
        // For now, we'll just log that we would load events
        console.log("[ActivityPanel] Would load initial events for board:", boardId);
      } catch (error) {
        console.error("[ActivityPanel] Error loading initial events:", error);
      }
    };
    
    loadInitialEvents();

    return () => {
      // Cleanup
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
      }
      if (cleanupListener) cleanupListener();
      notificationManager.leaveBoard(boardId, userId);
    };
  }, [boardId, userId]);

  const getEventIcon = (eventType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      CardCreated: <Plus className="w-3.5 h-3.5" />,
      CardUpdated: <Edit className="w-3.5 h-3.5" />,
      CardMoved: <Move className="w-3.5 h-3.5" />,
      CardDeleted: <Trash2 className="w-3.5 h-3.5" />,
      ColumnCreated: <List className="w-3.5 h-3.5" />,
      ColumnUpdated: <Edit className="w-3.5 h-3.5" />,
      ColumnDeleted: <Trash2 className="w-3.5 h-3.5" />,
      ColumnReordered: <Move className="w-3.5 h-3.5" />,
      BoardUpdated: <Settings className="w-3.5 h-3.5" />,
      BoardMemberAdded: <UserPlus className="w-3.5 h-3.5" />,
      BoardMemberRemoved: <UserMinus className="w-3.5 h-3.5" />,
    };
    return iconMap[eventType] || <Activity className="w-3.5 h-3.5" />;
  };

  const formatEventType = (eventType: string): string => {
    const typeMap: Record<string, string> = {
      CardCreated: "Card Created",
      CardUpdated: "Card Updated",
      CardMoved: "Card Moved",
      CardDeleted: "Card Deleted",
      ColumnCreated: "Column Created",
      ColumnUpdated: "Column Updated",
      ColumnDeleted: "Column Deleted",
      ColumnReordered: "Columns Reordered",
      BoardCreated: "Board Created",
      BoardUpdated: "Board Settings Updated",
      BoardDeleted: "Board Deleted",
      BoardMemberAdded: "Member Added",
      BoardMemberRemoved: "Member Removed",
    };
    return typeMap[eventType] || eventType;
  };

  const formatEventDescription = (event: AuditEvent): string => {
    const { eventType, data } = event;
    
    switch (eventType) {
      case "CardCreated":
        return `Created card "${data.title || 'Untitled'}" in column "${data.columnTitle || 'Unknown'}"`;
      case "CardUpdated":
        const updates = [];
        if (data.patch?.title) updates.push(`title to "${data.patch.title}"`);
        if (data.patch?.description !== undefined) updates.push('description');
        if (data.patch?.due_date !== undefined) updates.push('due date');
        if (data.patch?.assigneeId !== undefined) updates.push('assignee');
        if (data.patch?.labels) updates.push('labels');
        const cardTitle = data.title || data.patch?.title || 'Untitled';
        return `Updated card "${cardTitle}" - ${updates.length > 0 ? updates.join(', ') : 'properties changed'}`;
      case "CardMoved":
        return `Moved card "${data.title || 'Untitled'}" from "${data.fromColumnTitle || 'Unknown'}" to "${data.toColumnTitle || 'Unknown'}"`;
      case "CardDeleted":
        return `Deleted card "${data.title || 'Untitled'}" from column "${data.columnTitle || 'Unknown'}"`;
      case "ColumnCreated":
        return `Created new column "${data.title || 'Untitled'}"`;
      case "ColumnUpdated":
        return `Renamed column to "${data.title || 'Unknown'}"`;
      case "ColumnDeleted":
        return `Deleted column "${data.title || 'Untitled'}" and all its cards`;
      case "ColumnReordered":
        return `Reordered columns on the board`;
      case "BoardUpdated":
        return `Updated board settings`;
      case "BoardMemberAdded":
        return `Added ${data.username || 'a user'} as ${data.role || 'member'}`;
      case "BoardMemberRemoved":
        return `Removed ${data.username || 'a user'} from the board`;
      default:
        return `Performed ${formatEventType(eventType)}`;
    }
  };

  const getEventColor = (eventType: string): string => {
    if (eventType.includes("Created")) return "text-green-600 bg-green-50";
    if (eventType.includes("Updated")) return "text-blue-600 bg-blue-50";
    if (eventType.includes("Deleted") || eventType.includes("Removed")) return "text-red-600 bg-red-50";
    if (eventType.includes("Moved") || eventType.includes("Reordered")) return "text-purple-600 bg-purple-50";
    if (eventType.includes("Added")) return "text-emerald-600 bg-emerald-50";
    return "text-gray-600 bg-gray-50";
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2"
      >
        <Activity className="w-5 h-5" />
        Activity ({events.length})
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[32rem] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Log
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {connectionError && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {connectionError}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {events.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
            <p className="text-xs mt-1">
              {isConnected ? 'Connected to server' : 'Connecting to server...'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                className="relative group p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                      {event.actorId === userId ? (
                        <UserCheck className="w-4 h-4" />
                      ) : event.actorId ? (
                        `U${event.actorId.slice(0, 2)}`
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                  
                  {/* Event Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {event.actorId === userId ? 'You' : event.actorId ? `User ${event.actorId.slice(0, 6)}` : 'System'}
                        </span>
                        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEventColor(event.eventType)}`}>
                          <div className="mr-1">
                            {getEventIcon(event.eventType)}
                          </div>
                          {formatEventType(event.eventType)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    <div className="mt-1 text-sm text-gray-700">
                      {formatEventDescription(event)}
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-400">
                      {new Date(event.timestamp).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
