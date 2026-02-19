/* =============================================================================
   GLOBALGIVING API CLIENT
   
   Server-side utilities for interacting with the GlobalGiving API.
   - Fetches projects for the user to browse
   - Submits donations on behalf of users
   
   Docs: https://www.globalgiving.org/api/
============================================================================= */

import type {
  GlobalGivingProject,
  GlobalGivingProjectsResponse,
  GlobalGivingDonationRequest,
} from "@/types/rewards";

const GLOBALGIVING_API_BASE = "https://api.globalgiving.org/api";

/**
 * Fetch active projects from GlobalGiving (public endpoint, uses API key).
 * Used on the client via the /api/globalgiving/projects proxy route.
 */
export async function fetchProjects(
  apiKey: string,
  options: { nextProjectId?: number; keyword?: string } = {},
): Promise<{
  projects: GlobalGivingProject[];
  hasNext: boolean;
  nextProjectId?: number;
  total: number;
}> {
  let url = `${GLOBALGIVING_API_BASE}/public/projectservice/all/projects/active`;

  // If searching by keyword, use the search endpoint instead
  if (options.keyword) {
    url = `${GLOBALGIVING_API_BASE}/public/services/search/projects?q=${encodeURIComponent(options.keyword)}`;
  }

  const params = new URLSearchParams({ api_key: apiKey });
  if (options.nextProjectId) {
    params.set("nextProjectId", String(options.nextProjectId));
  }

  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    // Cache for 5 minutes to avoid excessive API calls
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `GlobalGiving API error (${response.status}): ${text.slice(0, 200)}`,
    );
  }

  const data: GlobalGivingProjectsResponse = await response.json();
  const projectList = data.projects?.project ?? [];

  return {
    projects: projectList.map(normalizeProject),
    hasNext: data.projects?.hasNext ?? false,
    nextProjectId: data.projects?.nextProjectId,
    total: data.projects?.numberFound ?? projectList.length,
  };
}

/**
 * Submit a donation to a GlobalGiving project.
 * Requires the GLOBALGIVING_API_KEY (server-side secret with donation scope).
 *
 * POST https://api.globalgiving.org/api/secure/donation
 */
export async function submitDonation(params: {
  apiKey: string;
  projectId: number;
  amountUSD: number; // GlobalGiving accepts USD
  donorEmail: string;
  donorFirstName?: string;
  donorLastName?: string;
}): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  const body: GlobalGivingDonationRequest = {
    donation: {
      amount: params.amountUSD,
      project: { id: params.projectId },
      donor: {
        email: params.donorEmail,
        firstName: params.donorFirstName || "Lingua",
        lastName: params.donorLastName || "User",
      },
    },
  };

  const response = await fetch(`${GLOBALGIVING_API_BASE}/secure/donation`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`GlobalGiving donation failed (${response.status}):`, text);
    return {
      success: false,
      error: `Donation failed (${response.status}): ${text.slice(0, 200)}`,
    };
  }

  const data = await response.json();
  return {
    success: true,
    transactionId: data?.donation?.id?.toString(),
  };
}

/** Normalize a raw GlobalGiving project to the expected shape */
function normalizeProject(raw: any): GlobalGivingProject {
  return {
    id: raw.id,
    title: raw.title ?? raw.name ?? "",
    summary: raw.summary ?? raw.activities ?? "",
    themeName: raw.themeName ?? raw.themes?.theme?.[0]?.name ?? "General",
    imageLink:
      raw.imageLink ?? raw.image?.imagelink?.[0]?.url ?? raw.imageUrl ?? "",
    country: raw.country ?? raw.countries?.country?.[0]?.name ?? "",
    region: raw.region ?? "",
    funding: raw.funding ?? 0,
    goal: raw.goal ?? 0,
    numberOfDonations: raw.numberOfDonations ?? 0,
    projectLink: raw.projectLink ?? "",
  };
}
