import type { Metadata } from "next";
import { DashboardScreen } from "@/components/dashboards/dashboard-screen";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ params }: { params: Promise<{ dashboardId: string }> }) {
  const { dashboardId } = await params;
  return <DashboardScreen dashboardId={dashboardId} />;
}
