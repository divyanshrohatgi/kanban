import React, { useEffect, useState } from "react";
import { notificationManager } from "../../lib/notifications";
import { Clock, User, Activity, X } from "lucide-react";

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

  useEffect(() => {
    const listenerId = `activity-panel-${boardId}`;

    // Join board room when component mounts
    notificationManager.joinBoard(boardId, userId);

    // Listen for audit events
    const handleAuditEvent = (event: AuditEvent) => {
      console.log("[ActivityPanel] Received event:", event);
      console.log("[ActivityPanel] Current boardId:", boardId);
      console.log("[ActivityPanel] Event boardId:", event.boardId);
      if (event.boardId === boardId) {
        console.log("[ActivityPanel] Adding event for board:", boardId, event);
        setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
      } else {
        console.log("[ActivityPanel] Ignoring event for different board");
      }
    };

    notificationManager.addListener(listenerId, handleAuditEvent);

    return () => {
      notificationManager.removeListener(listenerId);
      notificationManager.leaveBoard(boardId, userId);
    };
  }, [boardId, userId]);

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
      BoardUpdated: "Board Updated",
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
        return `Created a new card`;
      case "CardUpdated":
        return `Updated card properties`;
      case "CardMoved":
        return `Moved a card`;
      case "CardDeleted":
        return `Deleted a card`;
      case "ColumnCreated":
        return `Created column`;
      case "ColumnUpdated":
        return `Updated column name`;
      case "ColumnDeleted":
        return `Deleted a column`;
      case "ColumnReordered":
        return `Reordered columns`;
      case "BoardUpdated":
        return `Updated board settings`;
      case "BoardMemberAdded":
        return `Added member with ${data.role} role`;
      case "BoardMemberRemoved":
        return `Removed a member`;
      default:
        return `Performed ${formatEventType(eventType)}`;
    }
  };

  const getEventColor = (eventType: string): string => {
    if (eventType.includes("Created")) return "text-green-600 bg-green-50";
    if (eventType.includes("Updated")) return "text-blue-600 bg-blue-50";
    if (eventType.includes("Deleted")) return "text-red-600 bg-red-50";
    if (eventType.includes("Moved")) return "text-purple-600 bg-purple-50";
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
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-white border border-gray-200 rounded-lg shadow-xl">
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
      
      <div className="max-h-80 overflow-y-auto p-2">
        {events.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
            <p className="text-xs mt-1">
              Connected: {notificationManager.isSocketConnected() ? "Yes" : "No"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`p-1 rounded-full ${getEventColor(event.eventType)}`}>
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {formatEventType(event.eventType)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatEventDescription(event)}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(event.timestamp).toLocaleTimeString()}
                    {event.actorId && (
                      <>
                        <User className="w-3 h-3" />
                        <span>User {event.actorId.slice(0, 8)}</span>
                      </>
                    )}
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
