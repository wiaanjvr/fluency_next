"use client";

import { LiveStatsWidget } from "./LiveStatsWidget";
import { LeaderboardWidget } from "./LeaderboardWidget";
import { HowDepthWorksWidget } from "./HowDepthWorksWidget";
import { YourDepthStatsWidget } from "./YourDepthStatsWidget";

export function CommunitySidebar() {
  return (
    <aside className="w-72 xl:w-80 shrink-0 hidden lg:block space-y-5">
      <LiveStatsWidget />
      <YourDepthStatsWidget />
      <LeaderboardWidget />
      <HowDepthWorksWidget />
    </aside>
  );
}
