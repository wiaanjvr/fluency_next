"use client";

import { useParams } from "next/navigation";
import { FoundationSessionPage } from "@/components/foundation";

export default function SessionPage() {
  const params = useParams();
  const sessionIndex = parseInt(params.id as string, 10);

  // Validate session index
  if (isNaN(sessionIndex) || sessionIndex < 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Invalid session</p>
      </div>
    );
  }

  return <FoundationSessionPage sessionIndex={sessionIndex} />;
}
