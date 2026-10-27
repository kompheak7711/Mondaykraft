"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { Bold, Italic, Link2, List, ListOrdered, Strikethrough } from "lucide-react";
import { cn } from "cn";
import { IconButton } from "@/components/ui/icon-button";
import { PersonAvatar } from "@/components/ui/avatar-stack";
import type { Person } from "@/lib/columns/types";

type MentionState = { items: Person[]; command: (p: { id: string; label: string }) => void; pos: { top: number; left: number } | null; index: number } | null;

/** TipTap editor with bold, italic, strike, lists, links and @mentions. Cmd/Ctrl+Enter submits. */
export function UpdateEditor({ members, initial, placeholder = "Write an update… Use @ to mention a teammate.", onSubmit, onCancel, autoFocus, submitLabel = "Post", className }: {
  members: Person[];
  initial?: JSONContent;
  placeholder?: string;
  onSubmit: (doc: JSONContent) => Promise<unknown> | void;
  onCancel?: () => void;
  autoFocus?: boolean;
  submitLabel?: string;
  className?: string;
}) {
  const [mention, setMention] = useState<MentionState>(null);
  const mentionRef = useRef<MentionState>(null);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<() => void>(() => {});
  useEffect(() => { mentionRef.current = mention; }, [mention]);
  // Popup position relative to the editor, read in the suggestion handlers (never during render).
  const place = (rect: DOMRect | null | undefined) => {
    const box = wrapRef.current?.getBoundingClientRect();
    return rect && box ? { top: rect.bottom - box.top + 4, left: Math.max(0, rect.left - box.left) } : null;
  };

  const editor = useEditor({
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    content: initial,
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false }),
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: { class: "rounded-sm bg-brand-soft px-1 font-medium text-brand-text" },
        renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
        suggestion: {
          char: "@",
          items: ({ query }) => members.filter((m) => m.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8),
          render: () => ({
            onStart: (p: SuggestionProps<Person>) => setMention({ items: p.items, command: p.command, pos: place(p.clientRect?.()), index: 0 }),
            onUpdate: (p: SuggestionProps<Person>) => { const pos = place(p.clientRect?.()); setMention((m) => ({ items: p.items, command: p.command, pos, index: Math.min(m?.index ?? 0, Math.max(0, p.items.length - 1)) })); },
            onKeyDown: ({ event }: SuggestionKeyDownProps) => {
              const m = mentionRef.current;
              if (!m) return false;
              if (event.key === "ArrowDown") { setMention({ ...m, index: (m.index + 1) % Math.max(1, m.items.length) }); return true; }
              if (event.key === "ArrowUp") { setMention({ ...m, index: (m.index - 1 + m.items.length) % Math.max(1, m.items.length) }); return true; }
              if (event.key === "Enter" && m.items[m.index]) { m.command({ id: m.items[m.index].id, label: m.items[m.index].name }); return true; }
              if (event.key === "Escape") { setMention(null); return true; }
              return false;
            },
            onExit: () => setMention(null),
          }),
        },
      }),
    ],
    editorProps: {
      attributes: { class: "tiptap min-h-24 px-3 py-2 text-base outline-none", role: "textbox", "aria-multiline": "true", "aria-label": "Update" },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { submitRef.current(); return true; }
        if (event.key === "Escape" && onCancel && !mentionRef.current) { onCancel(); return true; }
        return false;
      },
    },
  });

  const submit = async () => {
    if (!editor || busy || editor.isEmpty) return;
    setBusy(true);
    try {
      await onSubmit(editor.getJSON());
      if (!initial) editor.commands.clearContent();
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { submitRef.current = submit; });
  useEffect(() => () => editor?.destroy(), [editor]);
  const pos = mention?.pos ?? null;

  return (
    <div ref={wrapRef} className={cn("relative rounded-md border border-border-input bg-bg focus-within:ring-2 focus-within:ring-brand", className)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      {mention && pos && mention.items.length ? (
        <ul role="listbox" aria-label="Mention a teammate" className="absolute z-50 w-64 rounded-md border border-border bg-bg p-1 shadow-pop" style={{ top: pos.top, left: pos.left }}>
          {mention.items.map((m, i) => (
            <li key={m.id}>
              <button type="button" role="option" aria-selected={i === mention.index} onMouseDown={(e) => { e.preventDefault(); mention.command({ id: m.id, label: m.name }); }}
                className={cn("flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-surface-2", i === mention.index && "bg-surface-2")}>
                <PersonAvatar person={m} size={24} /> <span className="truncate">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-1.5">
        <span className="text-xs text-text-muted">⌘↵ to {submitLabel.toLowerCase()}</span>
        <div className="flex gap-2">
          {onCancel ? <button type="button" onClick={onCancel} className="rounded-md px-3 py-1 text-sm hover:bg-surface-2">Cancel</button> : null}
          <button type="button" onClick={submit} disabled={busy} aria-busy={busy} className="rounded-md bg-brand px-3 py-1 text-sm font-medium text-on-brand hover:bg-brand-hover disabled:opacity-50">{submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  const btn = (label: string, Icon: typeof Bold, active: boolean, run: () => void) => (
    <IconButton aria-label={label} aria-pressed={active} size="sm" onClick={run} className={cn(active && "bg-surface-2 text-brand-text")}><Icon /></IconButton>
  );
  return (
    <div role="toolbar" aria-label="Formatting" className="flex items-center gap-0.5 border-b border-border px-1 py-1">
      {btn("Bold", Bold, editor.isActive("bold"), () => editor.chain().focus().toggleBold().run())}
      {btn("Italic", Italic, editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run())}
      {btn("Strikethrough", Strikethrough, editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run())}
      {btn("Bullet list", List, editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())}
      {btn("Numbered list", ListOrdered, editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run())}
      {btn("Link", Link2, editor.isActive("link"), () => {
        const prev = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("Link address", prev ?? "https://");
        if (url === null) return;
        if (!url) editor.chain().focus().unsetLink().run();
        else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      })}
    </div>
  );
}

/** Read-only rendering of a stored TipTap document. */
export function UpdateBody({ doc }: { doc: JSONContent }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    content: doc,
    extensions: [StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false }), Link.configure({ openOnClick: true }), Mention.configure({ HTMLAttributes: { class: "rounded-sm bg-brand-soft px-1 font-medium text-brand-text" }, renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}` })],
    editorProps: { attributes: { class: "tiptap text-sm", "aria-label": "Update text", "aria-readonly": "true" } },
  });
  useEffect(() => { editor?.commands.setContent(doc); }, [doc, editor]);
  return <EditorContent editor={editor} />;
}
