"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { Check, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, Folder, Home, Inbox, LayoutDashboard, Plus, Star, Table2, Trash2, User } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { setCurrentWorkspace } from "@/app/(app)/actions";
import { NewBoardDialog, NewDashboardDialog, NewFolderDialog, NewWorkspaceDialog } from "./create-dialogs";

export type SidebarData = {
  workspaces: { id: string; name: string; color: string | null }[];
  current: { id: string; name: string; color: string | null };
  role: string;
  boards: { id: string; name: string; folder_id: string | null; kind: string; archived_at: string | null }[];
  folders: { id: string; name: string; color: string | null; parent_folder_id: string | null }[];
  dashboards: { id: string; name: string; folder_id: string | null; kind: string }[];
  favorites: { board_id: string | null; dashboard_id: string | null }[];
};

type Props = SidebarData & { collapsed: boolean; onToggle: () => void; onNavigate?: () => void };

export function Sidebar({ workspaces, current, role, boards, folders, dashboards, favorites, collapsed, onToggle, onNavigate }: Props) {
  const pathname = usePathname();
  const [dialog, setDialog] = useState<"board" | "dashboard" | "folder" | "workspace" | null>(null);
  const liveBoards = boards.filter((b) => !b.archived_at);
  const canAdd = role !== "viewer";

  const favItems = favorites.flatMap((f): { type: "board" | "dashboard"; id: string; name: string }[] => {
    if (f.board_id) {
      const b = liveBoards.find((x) => x.id === f.board_id);
      return b ? [{ type: "board" as const, id: b.id, name: b.name }] : [];
    }
    const d = dashboards.find((x) => x.id === f.dashboard_id);
    return d ? [{ type: "dashboard" as const, id: d.id, name: d.name }] : [];
  });

  const tree = (parent: string | null, depth = 0) => (
    <>
      {folders.filter((f) => f.parent_folder_id === parent).map((f) => (
        <FolderNode key={f.id} name={f.name} depth={depth}>
          {tree(f.id, depth + 1)}
        </FolderNode>
      ))}
      {liveBoards.filter((b) => b.folder_id === parent).map((b) => (
        <div key={b.id} style={{ paddingLeft: depth * 12 }}>
          <NavItem pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} href={`/boards/${b.id}`} icon={Table2} label={b.name} />
        </div>
      ))}
      {dashboards.filter((d) => d.folder_id === parent).map((d) => (
        <div key={d.id} style={{ paddingLeft: depth * 12 }}>
          <NavItem pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} href={`/dashboards/${d.id}`} icon={LayoutDashboard} label={d.name} />
        </div>
      ))}
    </>
  );

  return (
    <nav aria-label="Workspace" className={cn("flex h-full flex-col border-r border-border bg-surface", collapsed ? "w-sidebar-collapsed" : "w-sidebar")}>
      <div className={cn("flex h-topbar items-center gap-1 border-b border-border px-2", collapsed && "justify-center")}>
        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="min-w-0 flex-1 justify-start gap-2 px-2" aria-label={`Workspace: ${current.name}. Switch workspace`}>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-brand text-xs font-bold text-on-brand" aria-hidden>{current.name.slice(0, 1).toUpperCase()}</span>
                <span className="truncate font-semibold">{current.name}</span>
                <ChevronDown className="ml-auto size-4 text-text-muted" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              {workspaces.map((w) => (
                <DropdownMenuItem key={w.id} onSelect={() => setCurrentWorkspace(w.id)}>
                  <span className="truncate">{w.name}</span>
                  {w.id === current.id && <Check className="ml-auto size-4" aria-label="current" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDialog("workspace")}><Plus className="size-4" /> New workspace</DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/members">Members</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <IconButton aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} size="sm" onClick={onToggle} className="hidden md:inline-flex">
          {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
        </IconButton>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-2">
        <div className="space-y-0.5">
          <NavItem pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} href="/" icon={Home} label="Home" exact />
          <NavItem pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} href="/my-work" icon={User} label="My Work" />
          <NavItem pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} href="/inbox" icon={Inbox} label="Inbox" />
        </div>

        {!collapsed && favItems.length > 0 && (
          <div>
            <SectionTitle>Favorites</SectionTitle>
            {favItems.map((f) => (
              <NavItem pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} key={f.type + f.id} href={f.type === "board" ? `/boards/${f.id}` : `/dashboards/${f.id}`} icon={Star} label={f.name} />
            ))}
          </div>
        )}

        {!collapsed && (
          <div>
            <div className="flex items-center justify-between pr-1">
              <SectionTitle>Boards</SectionTitle>
              {canAdd && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton aria-label="Add a board, dashboard or folder" size="sm"><Plus /></IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setDialog("board")}><Table2 className="size-4" /> New board</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialog("dashboard")}><LayoutDashboard className="size-4" /> New dashboard</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDialog("folder")}><Folder className="size-4" /> New folder</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="space-y-0.5">
              {tree(null)}
              {liveBoards.length === 0 && dashboards.length === 0 && (
                <p className="px-2 py-3 text-xs text-text-muted">No boards yet. {canAdd ? "Add one with the plus button." : "Ask an admin to add one."}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-0.5 border-t border-border p-2">
        <NavItem pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} href="/trash" icon={Trash2} label="Trash" />
      </div>

      <NewBoardDialog open={dialog === "board"} onOpenChange={(o) => !o && setDialog(null)} workspaceId={current.id} folders={folders} />
      <NewDashboardDialog open={dialog === "dashboard"} onOpenChange={(o) => !o && setDialog(null)} workspaceId={current.id} />
      <NewFolderDialog open={dialog === "folder"} onOpenChange={(o) => !o && setDialog(null)} workspaceId={current.id} />
      <NewWorkspaceDialog open={dialog === "workspace"} onOpenChange={(o) => !o && setDialog(null)} />
    </nav>
  );
}

type NavItemProps = { href: string; icon: ComponentType<{ className?: string }>; label: string; exact?: boolean; pathname: string; collapsed: boolean; onNavigate?: () => void };

function NavItem({ href, icon: Icon, label, exact, pathname, collapsed, onNavigate }: NavItemProps) {
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-2 text-sm text-text hover:bg-surface-2",
        active && "bg-brand-soft font-medium text-brand-text hover:bg-brand-soft",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ) : link;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="px-2 py-1 text-xs font-semibold text-text-muted">{children}</h2>;
}

function FolderNode({ name, depth, children }: { name: string; depth: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ paddingLeft: depth * 12 + 8 }}
        className="flex h-8 w-full items-center gap-2 rounded-md pr-2 text-sm text-text hover:bg-surface-2"
      >
        {open ? <ChevronDown className="size-4 shrink-0 text-text-muted" aria-hidden /> : <ChevronRight className="size-4 shrink-0 text-text-muted" aria-hidden />}
        <Folder className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{name}</span>
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}
