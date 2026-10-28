"use client";

import Link from "next/link";
import { Bell, CloudOff, Inbox, LogOut, Menu, RefreshCw, Search, Settings, Trash2, UserPlus } from "lucide-react";
import { useOffline } from "@/lib/offline";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Kbd } from "@/components/ui/kbd";
import { PersonAvatar } from "@/components/ui/avatar-stack";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { signOut } from "@/app/(auth)/actions";

type Props = {
  profile: { id: string; name: string; email: string; avatar_url: string | null };
  unread: number;
  workspaceName: string;
  onMenu: () => void;
};

function ConnectionBadge() {
  const { online, pending } = useOffline();
  if (online && pending === 0) return null;
  const edits = `${pending} ${pending === 1 ? "edit" : "edits"}`;
  return (
    <span role="status" aria-label="Connection" className={online ? "flex items-center gap-1 rounded-pill bg-surface-2 px-2 py-0.5 text-xs text-text-muted" : "flex items-center gap-1 rounded-pill bg-warning-soft px-2 py-0.5 text-xs text-text"}>
      {online ? <><RefreshCw className="size-3 animate-spin" aria-hidden /> Syncing {edits}</> : <><CloudOff className="size-3" aria-hidden /> Offline{pending ? ` · ${edits} waiting` : ""}</>}
    </span>
  );
}

export function TopBar({ profile, unread, workspaceName, onMenu }: Props) {
  return (
    <header className="flex h-topbar shrink-0 items-center gap-2 border-b border-border bg-bg px-2 sm:px-4">
      <IconButton aria-label="Open navigation" className="md:hidden" onClick={onMenu}><Menu /></IconButton>
      <span className="truncate font-semibold md:hidden">{workspaceName}</span>
      <span className="ml-auto" /><ConnectionBadge />
      <Button asChild variant="outline" className="hidden w-64 justify-start gap-2 text-text-muted sm:flex">
        <Link href="/search" aria-label="Search (Command K)">
          <Search className="size-4" /> Search <Kbd className="ml-auto">⌘K</Kbd>
        </Link>
      </Button>
      <IconButton aria-label="Search" className="sm:hidden" href="/search"><Search /></IconButton>
      <Button asChild variant="ghost" className="hidden sm:inline-flex">
        <Link href="/members"><UserPlus className="size-4" /> Invite</Link>
      </Button>
      <IconButton aria-label="Inbox" href="/inbox"><Inbox /></IconButton>
      <IconButton aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} badge={unread || undefined} href="/notifications"><Bell /></IconButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="ml-1 rounded-pill" aria-label={`Account menu for ${profile.name}`}>
            <PersonAvatar person={{ id: profile.id, name: profile.name, avatarUrl: profile.avatar_url }} size={32} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="truncate font-medium text-text">{profile.name}</div>
            <div className="truncate text-xs text-text-muted">{profile.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/settings"><Settings className="size-4" /> Profile and settings</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/trash"><Trash2 className="size-4" /> Trash</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut()}><LogOut className="size-4" /> Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
