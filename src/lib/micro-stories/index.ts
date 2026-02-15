export {
  // Story selection
  calculateStoryMatch,
  selectStoriesForUser,
  getNextRecommendedStory,

  // Word click tracking
  getWordClickHistory,
  saveWordClickHistory,
  initializeWordClickHistory,
  recordWordClick,
  getWordsNeedingReview,
  markWordReviewed,

  // Progress tracking
  getMicroStoryProgress,
  saveMicroStoryProgress,
  initializeMicroStoryProgress,
  checkMicroStoriesUnlock,
  recordStoryCompletion,

  // Scaffolding utilities
  getRecommendedScaffoldingMode,
  prepareScaffoldedStory,
} from "./utils";
