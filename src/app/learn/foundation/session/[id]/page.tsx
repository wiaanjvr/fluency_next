"use client";

import { useParams } from "next/navigation";
import { FoundationSessionPage } from "@/components/foundation";

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  // Support both "next" (dynamic SRS-based session) and numeric session IDs
  const sessionIndex = sessionId === "next" ? -1 : parseInt(sessionId, 10);

  // Validate session index
  if (sessionId !== "next" && (isNaN(sessionIndex) || sessionIndex < 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Invalid session</p>
      </div>
    );
  }

  return <FoundationSessionPage sessionIndex={sessionIndex} />;
}
