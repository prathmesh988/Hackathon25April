import { createFileRoute } from "@tanstack/react-router";
import { Tldraw } from "tldraw";
import useWorkspaceStore from "@/store/workspace";
import "tldraw/tldraw.css";
import { useSyncDemo } from "@tldraw/sync";
import { useEffect } from "react";

export const Route = createFileRoute(
  "/dashboard/workspace/$workspaceId/whiteboard"
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { workspace } = useWorkspaceStore();

  const store = useSyncDemo({ roomId: workspace?.id || "default-room-id" });
  useEffect(() => console.log(workspace), [workspace]);
  return (
    <div className="tldraw__editor w-[100%] h-[100vh] fixed top-0 left-0">
      <Tldraw store={store}></Tldraw>
    </div>
  );
}
