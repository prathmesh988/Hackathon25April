import { API_URL } from "@/constants/urls";
import { Route } from "@/routes/dashboard/workspace/$workspaceId/project/$projectId";
import useProjectStore from "@/store/project";
import { useEffect, useRef } from "react";

type WebSocketHook = {
  ws: WebSocket | null;
};

function useBoardWebSocket(): WebSocketHook {
  const wsRef = useRef<WebSocket | null>(null);
  const { projectId } = Route.useParams();
  const { setProject } = useProjectStore();

  useEffect(() => {
    if (!projectId) return;

    const socket = new WebSocket(`${API_URL}/task/ws/${projectId}`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProject(data);
      } catch (error) {
        console.error("WebSocket message parsing error", error);
      }
    };

    wsRef.current = socket;

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, [projectId, setProject]);

  return {
    ws: wsRef.current,
  };
}

export default useBoardWebSocket;
