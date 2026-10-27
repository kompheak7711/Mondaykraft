import { Suspense } from "react";
import { BoardScreen } from "@/components/board/board-screen";

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  return (
    <Suspense>
      <BoardScreen boardId={boardId} />
    </Suspense>
  );
}
