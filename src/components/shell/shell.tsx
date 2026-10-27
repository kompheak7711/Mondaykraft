"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Sidebar, type SidebarData } from "./sidebar";
import { TopBar } from "./topbar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type Props = SidebarData & {
  profile: { id: string; name: string; email: string; avatar_url: string | null };
  unread: number;
  children: ReactNode;
};

export function Shell({ children, profile, unread, ...sidebar }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("tk_sidebar") === "collapsed");
    } catch {}
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("tk_sidebar", c ? "expanded" : "collapsed");
      } catch {}
      return !c;
    });
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg">
      <div className="hidden md:block">
        <Sidebar {...sidebar} collapsed={collapsed} onToggle={toggle} />
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar {...sidebar} collapsed={false} onToggle={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar profile={profile} unread={unread} workspaceName={sidebar.current.name} onMenu={() => setMobileOpen(true)} />
        <main id="main" className="min-h-0 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
