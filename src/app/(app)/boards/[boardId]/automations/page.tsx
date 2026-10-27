import type { Metadata } from "next";
import { AutomationsScreen } from "@/components/automations/automations-screen";

export const metadata: Metadata = { title: "Automations" };

export default async function AutomationsPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  return <AutomationsScreen boardId={boardId} />;
}
