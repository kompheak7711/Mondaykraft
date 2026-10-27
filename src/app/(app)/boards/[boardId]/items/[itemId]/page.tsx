import { Suspense } from "react";
import { BoardScreen } from "@/components/board/board-screen";

export default async function ItemPage({ params }: { params: Promise<{ boardId: string; itemId: string }> }) {
  const { boardId, itemId } = await params;
  return (
    <Suspense>
      <BoardScreen boardId={boardId} itemId={itemId} />
    </Suspense>
  );
}
