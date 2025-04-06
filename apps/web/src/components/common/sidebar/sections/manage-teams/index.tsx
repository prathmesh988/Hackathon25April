import { cn } from "@/lib/cn";
import { useUserPreferencesStore } from "@/store/user-preferences";
import useWorkspaceStore from "@/store/workspace";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Link } from "@tanstack/react-router"

function ManageTeams() {
  const { isSidebarOpened } = useUserPreferencesStore();
  const navigate = useNavigate();
  const { workspace } = useWorkspaceStore();
  const location = useRouterState({ select: (s) => s.location });
  const isOnTeamsRoute = location.pathname.includes("/teams");

  const onManageTeams = () => {
    if (!workspace) return;

    navigate({
      to: "/dashboard/teams/$workspaceId/members",
      params: {
        workspaceId: workspace.id,
      },
    });
  };

  const onOpenWhiteboard = () => {
    if (!workspace) return;
    navigate({
      to: "/dashboard/workspace/$workspaceId/whiteboard",
      params: {
        workspaceId: workspace.id
      }
    })
  }

  return (
    <div>
      <h2
        className={cn(
          "text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2",
          isSidebarOpened && "px-3",
        )}
      >
        {isSidebarOpened && "Team"}
      </h2>
      <button
        type="button"
        className={cn(
          "w-full text-left py-2 rounded-md flex items-center text-sm transition-all group",
          isSidebarOpened && "px-3",
          !isSidebarOpened && "justify-center px-2",
          "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
          isOnTeamsRoute &&
          "bg-indigo-51 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
        )}
        title={!isSidebarOpened ? "whiteboard" : undefined}
        onClick={() => onOpenWhiteboard()}
      >
        <Users
          className={cn(
            "shrink-0",
            !isSidebarOpened ? "w-6 h-6" : "w-4 h-4 mr-2",
          )}
        />
        {isSidebarOpened && "whiteboard"}
      </button>

      <button
        type="button"
        className={cn(
          "w-full text-left py-2 rounded-md flex items-center text-sm transition-all group",
          isSidebarOpened && "px-3",
          !isSidebarOpened && "justify-center px-2",
          "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
          isOnTeamsRoute &&
          "bg-indigo-51 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
        )}
        title={!isSidebarOpened ? "mangage  users" : undefined}
        onClick={() => onManageTeams()}
      >
        <Users
          className={cn(
            "shrink-0",
            !isSidebarOpened ? "w-6 h-6" : "w-4 h-4 mr-2",
          )}
        />
        {isSidebarOpened && "mangage users"}
      </button>
    </div>
  );
}

export default ManageTeams;
