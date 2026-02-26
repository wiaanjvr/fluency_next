// Ocean Theme Components
// The Ocean IS the UI — No modes, no levels, just depth.

export { OceanBackground } from "./OceanBackground";
export { OceanNavigation } from "./OceanNavigation";
export { NextLessonHero } from "./NextLessonHero";
export { WordProgressSection, WordProgressCard } from "./WordProgressSection";
export { DepthChart } from "./DepthChart";
export { DepthSidebar } from "./DepthSidebar";
export {
  DiveTransitionProvider,
  useDiveTransition,
  DiveTransitionContext,
} from "./DiveTransition";

// New depth progression components (re-export for convenience)
export { DepthIndicator } from "../navigation/DepthIndicator";
export { DepthSidebar as DepthSidebarV2 } from "../navigation/DepthSidebar";
export { ProgressDepthMeter } from "./ProgressDepthMeter";
