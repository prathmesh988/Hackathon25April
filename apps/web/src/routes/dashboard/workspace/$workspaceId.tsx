import EmptyProjectState from "@/components/project/empty-state";
import SelectProjectState from "@/components/project/select-project-state";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useGetWorkspace from "@/hooks/queries/workspace/use-get-workspace";
import useProjectStore from "@/store/project";
import useWorkspaceStore from "@/store/workspace";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/dashboard/workspace/$workspaceId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { workspaceId } = Route.useParams();
  const { data } = useGetWorkspace({
    workspaceId,
  });
  const { setWorkspace } = useWorkspaceStore();
  const { project } = useProjectStore();
  const { data: projects } = useGetProjects({
    workspaceId,
  });

  useEffect(() => {
    if (data) {
      setWorkspace(data);
    }
  }, [data, setWorkspace]);

  // Only show empty project state if we're not on the whiteboard route
  const isWhiteboardRoute = window.location.pathname.includes('/whiteboard');
  if (projects && projects.length === 0 && !isWhiteboardRoute) {
    return <EmptyProjectState />;
  }

  return (
    <>
      <Outlet />
      {!project && !isWhiteboardRoute && <SelectProjectState />}
    </>
  );
}
