"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, Globe, Heart, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GlobalGivingProject } from "@/types/rewards";
import { cn } from "@/lib/utils";

/* =============================================================================
   GLOBALGIVING PROJECT PICKER
   
   Fetches projects from the /api/globalgiving/projects proxy route.
   Displays a searchable grid of projects for the user to select one
   for their charity donation.
============================================================================= */

interface GlobalGivingProjectPickerProps {
  onSelect: (project: { id: string; name: string }) => void;
  selectedProjectId?: string;
}

export function GlobalGivingProjectPicker({
  onSelect,
  selectedProjectId,
}: GlobalGivingProjectPickerProps) {
  const [projects, setProjects] = useState<GlobalGivingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProjectList = useCallback(async (keyword?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (keyword) params.set("keyword", keyword);

      const res = await fetch(
        `/api/globalgiving/projects?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("Failed to fetch projects");
      }

      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (err) {
      console.error("Error fetching GlobalGiving projects:", err);
      setError("Unable to load projects. Please try again.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when search query changes
  useEffect(() => {
    fetchProjectList(debouncedQuery || undefined);
  }, [debouncedQuery, fetchProjectList]);

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects (e.g. education, clean water)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="text-center py-4 text-sm text-red-400">{error}</div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-ocean-turquoise" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading projects...
          </span>
        </div>
      )}

      {/* Project grid */}
      {!loading && !error && projects.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No projects found. Try a different search term.
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid gap-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
          {projects.slice(0, 12).map((project) => {
            const isSelected = selectedProjectId === String(project.id);

            return (
              <button
                key={project.id}
                onClick={() =>
                  onSelect({ id: String(project.id), name: project.title })
                }
                className={cn(
                  "flex items-start gap-3 p-3 rounded-2xl border-[1.5px] text-left transition-all duration-200",
                  "hover:border-ocean-turquoise/80 hover:bg-ocean-turquoise/5",
                  isSelected
                    ? "border-ocean-turquoise bg-ocean-turquoise/10 shadow-[0_0_12px_rgba(42,169,160,0.2)]"
                    : "border-border bg-card/50",
                )}
              >
                {/* Project image */}
                {project.imageLink && (
                  <img
                    src={project.imageLink}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight line-clamp-2">
                    {project.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {project.themeName && (
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {project.themeName}
                      </span>
                    )}
                    {project.country && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {project.country}
                      </span>
                    )}
                  </div>
                  {project.summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {project.summary}
                    </p>
                  )}
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-ocean-turquoise flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
