import { NextRequest, NextResponse } from "next/server";
import { fetchProjects } from "@/lib/globalgiving/client";

/* =============================================================================
   GLOBALGIVING PROJECTS API ROUTE

   GET /api/globalgiving/projects?keyword=education&nextProjectId=123

   Proxies the GlobalGiving public project list so the client-side
   GlobalGivingProjectPicker can search and browse projects.
============================================================================= */

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GLOBALGIVING_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GlobalGiving API key not configured" },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword") || undefined;
    const nextProjectId = searchParams.get("nextProjectId")
      ? parseInt(searchParams.get("nextProjectId")!, 10)
      : undefined;

    const data = await fetchProjects(apiKey, { keyword, nextProjectId });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GlobalGiving projects fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch projects",
      },
      { status: 500 },
    );
  }
}
