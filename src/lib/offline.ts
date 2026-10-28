"use client";

import { useSyncExternalStore } from "react";

/**
 * Edits made while offline keep their optimistic state and wait here, in order, until the browser is back online.
 * ponytail: in-memory queue, so edits still waiting are lost on reload. Persist descriptors in IndexedDB if that matters.
 */
type Job = { run: () => Promise<void> };
const queue: Job[] = [];
let flushing = false;
let snapshot = { online: true, pending: 0 };
const server = { online: true, pending: 0 };
const subs = new Set<() => void>();
const emit = () => {
  snapshot = { online: typeof navigator === "undefined" || navigator.onLine, pending: queue.length };
  subs.forEach((f) => f());
};

export const isNetworkError = (e: { message?: string } | null | undefined) =>
  (typeof navigator !== "undefined" && !navigator.onLine) || /fetch|network|offline|load failed|ERR_INTERNET/i.test(e?.message ?? "");

export function enqueue(job: Job) {
  queue.push(job);
  emit();
  if (snapshot.online) void flush();
}

/** Replays waiting jobs in order; stops at the first that still cannot reach the server. */
export async function flush() {
  if (flushing) return;
  flushing = true;
  while (queue.length && navigator.onLine) {
    try {
      await queue[0].run();
      queue.shift();
      emit();
    } catch {
      break;
    }
  }
  flushing = false;
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { emit(); void flush(); });
  window.addEventListener("offline", emit);
}

export function useOffline() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => snapshot, () => server);
}
