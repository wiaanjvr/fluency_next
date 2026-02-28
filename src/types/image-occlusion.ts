// ============================================================================
// Image Occlusion Types
// ============================================================================

/** A rectangular region on an image that can be occluded */
export interface OcclusionRegion {
  /** Unique ID for this region */
  id: string;
  /** X position as percentage (0-100) of image width */
  x: number;
  /** Y position as percentage (0-100) of image height */
  y: number;
  /** Width as percentage (0-100) of image width */
  width: number;
  /** Height as percentage (0-100) of image height */
  height: number;
  /** Optional label for the occluded region */
  label: string;
  /** Optional group number (for grouping related regions) */
  group?: number;
}

/** How image occlusion cards are generated */
export type OcclusionMode = "one-by-one" | "all-at-once";

/** Image occlusion note data stored in the fields JSON */
export interface ImageOcclusionData {
  /** URL of the source image */
  imageUrl: string;
  /** The occlusion regions */
  regions: OcclusionRegion[];
  /** Display mode */
  mode: OcclusionMode;
  /** Optional extra notes */
  extra?: string;
}
