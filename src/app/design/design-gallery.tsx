"use client";

import { useState } from "react";
import { Bell, Inbox, MoreHorizontal, Plus, Search, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { StatusChip, LABEL_COLORS } from "@/components/ui/status-chip";
import { AvatarStack, PersonAvatar } from "@/components/ui/avatar-stack";
import { EmptyState } from "@/components/ui/empty-state";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const people = [
  { id: "1", name: "Ana Lima" },
  { id: "2", name: "Ben Okafor" },
  { id: "3", name: "Viv Chen" },
  { id: "4", name: "Dan Reyes" },
  { id: "5", name: "Eve Park" },
  { id: "6", name: "Finn Moor" },
  { id: "7", name: "Gia Ruiz" },
];

const roles = [
  ["bg", "bg-bg"], ["surface", "bg-surface"], ["surface-2", "bg-surface-2"], ["border", "bg-border"], ["border-strong", "bg-border-strong"],
  ["border-input", "bg-border-input"], ["text", "bg-text"], ["text-muted", "bg-text-muted"], ["brand", "bg-brand"], ["brand-soft", "bg-brand-soft"],
  ["danger", "bg-danger"], ["danger-soft", "bg-danger-soft"], ["success", "bg-success"], ["success-soft", "bg-success-soft"], ["warning", "bg-warning"], ["warning-soft", "bg-warning-soft"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-28 shrink-0 text-xs font-medium text-text-muted">{label}</span>
      {children}
    </div>
  );
}

export function DesignGallery() {
  const [checked, setChecked] = useState(true);
  return (
    <main className="mx-auto w-full max-w-5xl space-y-12 px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Taskraft design system</h1>
          <p className="text-sm text-text-muted">Primitives with every state, rendered from the tokens. Switch the theme to check both palettes.</p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Colour roles">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {roles.map(([name, cls]) => (
            <div key={name} className="space-y-1">
              <div className={`h-12 rounded-md border border-border ${cls}`} />
              <div className="text-xs text-text-muted">{name}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {LABEL_COLORS.map((c) => (
            <StatusChip key={c} label={c} color={c} className="w-full" />
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="space-y-2">
          <p className="text-display font-bold">Display 40/44</p>
          <p className="text-xl font-bold">Heading 28/34</p>
          <p className="text-lg font-semibold">Board name 20/28</p>
          <p className="text-base">Editor body 16/24. Updates are written at this size.</p>
          <p className="text-sm">App body 14/20. Cells, menus, forms and most of the interface.</p>
          <p className="text-xs font-medium text-text-muted">Meta 12/16 · column footers, badges, timestamps</p>
          <p className="font-mono text-sm">mono 14 · tabular numbers 1,240.50</p>
        </div>
      </Section>

      <Section title="Buttons">
        <Row label="variants">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="link">Link</Button>
        </Row>
        <Row label="sizes">
          <Button size="sm">Small 28</Button>
          <Button>Medium 32</Button>
          <Button size="lg">Large 36</Button>
        </Row>
        <Row label="states">
          <Button disabled>Disabled</Button>
          <Button aria-busy>
            <Spinner className="text-on-brand" /> Saving
          </Button>
          <Button>
            <Plus data-icon="inline-start" /> New item
          </Button>
          <span className="inline-flex">
            <Button className="rounded-r-none">New item</Button>
            <Button className="rounded-l-none border-l border-on-brand/30 px-2" aria-label="More options for New item">
              <MoreHorizontal />
            </Button>
          </span>
        </Row>
        <Row label="icon buttons">
          <IconButton aria-label="Notifications, 7 unread" badge={7}><Bell /></IconButton>
          <IconButton aria-label="Inbox, new updates" badge><Inbox /></IconButton>
          <IconButton aria-label="Search" size="sm"><Search /></IconButton>
          <IconButton aria-label="Settings" size="lg"><Settings /></IconButton>
          <IconButton aria-label="Delete" variant="destructive"><Trash2 /></IconButton>
          <IconButton aria-label="Disabled" disabled><Settings /></IconButton>
        </Row>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="d-name">Board name</Label>
            <Input id="d-name" placeholder="Launch plan" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-email">Email</Label>
            <Input id="d-email" defaultValue="not an email" aria-invalid aria-describedby="d-email-err" />
            <p id="d-email-err" className="text-xs text-danger">Enter an email address like ana@example.com.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-disabled">Disabled</Label>
            <Input id="d-disabled" disabled value="Read only" readOnly />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-notes">Update</Label>
            <Textarea id="d-notes" placeholder="Write an update..." />
          </div>
        </div>
        <Row label="toggles">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} /> Checkbox
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox disabled /> Locked
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch defaultChecked /> Automation on
          </label>
        </Row>
      </Section>

      <Section title="Status chips">
        <Row label="in cells">
          <div className="flex h-row w-column-default items-stretch border border-border">
            <StatusChip label="Working on it" color="orange" fill />
          </div>
          <div className="flex h-row w-column-default items-stretch border border-border">
            <StatusChip label="Done" color="green" done fill />
          </div>
          <div className="flex h-row w-column-default items-stretch border border-border">
            <StatusChip fill />
          </div>
        </Row>
        <Row label="priority">
          <StatusChip label="Critical" color="red" />
          <StatusChip label="High" color="orange" />
          <StatusChip label="Medium" color="blue" />
          <StatusChip label="Low" color="gray" />
        </Row>
      </Section>

      <Section title="People">
        <Row label="avatars">
          <PersonAvatar person={people[0]} size={24} />
          <PersonAvatar person={people[1]} size={28} />
          <PersonAvatar person={people[2]} size={32} />
          <PersonAvatar person={people[3]} size={40} />
        </Row>
        <Row label="presence">
          <AvatarStack people={people} size={28} />
          <AvatarStack people={people.slice(0, 2)} size={24} />
        </Row>
      </Section>

      <Section title="Badges, keys, tabs">
        <Row label="badges">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Failed</Badge>
          <span className="inline-flex h-6 items-center rounded-pill bg-brand-soft px-2 text-xs font-medium text-brand-text">Filtered 3</span>
        </Row>
        <Row label="keys">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
          <span className="text-xs text-text-muted">opens search</span>
        </Row>
        <Tabs defaultValue="updates" className="max-w-md">
          <TabsList>
            <TabsTrigger value="updates">Updates</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="activity">Activity log</TabsTrigger>
          </TabsList>
          <TabsContent value="updates" className="text-sm text-text-muted">Conversation about the item lives here.</TabsContent>
          <TabsContent value="files" className="text-sm text-text-muted">Every file attached to the item.</TabsContent>
          <TabsContent value="activity" className="text-sm text-text-muted">Who changed what, and when.</TabsContent>
        </Tabs>
      </Section>

      <Section title="Overlays">
        <Row label="menus">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Board menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Launch plan</DropdownMenuLabel>
              <DropdownMenuItem>Rename</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Popover</Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 text-sm">A small settings surface. Escape closes it and focus returns to the trigger.</PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>Tooltips name icon buttons and show shortcuts</TooltipContent>
          </Tooltip>
        </Row>
        <Row label="dialogs">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete board</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this board?</DialogTitle>
                <DialogDescription>It moves to the trash for 30 days. Items, updates and files go with it.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" autoFocus>Cancel</Button>
                </DialogClose>
                <Button variant="destructive">Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Item panel</Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-item-panel">
              <SheetHeader>
                <SheetTitle>Write spec</SheetTitle>
                <SheetDescription>Side panel, 640px on desktop, full screen on mobile.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </Row>
        <Row label="toasts">
          <Button variant="outline" onClick={() => toast.success("Item added")}>Success</Button>
          <Button variant="outline" onClick={() => toast.error("Could not save. Numbers only.")}>Error</Button>
          <Button variant="outline" onClick={() => toast("Item deleted", { action: { label: "Undo", onClick: () => toast.success("Restored") } })}>With undo</Button>
        </Row>
      </Section>

      <Section title="Command palette">
        <Command className="max-w-xl rounded-lg border border-border shadow-pop">
          <CommandInput placeholder="Search boards, items, people..." />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Boards">
              <CommandItem>Launch plan</CommandItem>
              <CommandItem>Content calendar</CommandItem>
            </CommandGroup>
            <CommandGroup heading="Actions">
              <CommandItem>New item</CommandItem>
              <CommandItem>New board</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </Section>

      <Section title="Loading and empty">
        <div className="max-w-md space-y-2" aria-busy>
          <Skeleton className="h-row w-full" />
          <Skeleton className="h-row w-5/6" />
          <Skeleton className="h-row w-2/3" />
        </div>
        <div className="rounded-lg border border-dashed border-border">
          <EmptyState icon={Inbox} title="No updates yet" description="Start the conversation about this item. Mention a teammate with @." action={<Button>Write an update</Button>} />
        </div>
      </Section>
    </main>
  );
}
