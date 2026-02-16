/**
 * Lesson Components - Export all lesson-related UI components
 *
 * New 10-phase lesson flow:
 * 1. SpacedRetrievalWarmupPhase - Quick recall of previous vocabulary
 * 2. PredictionStagePhase - Keywords + predict story content
 * 3. AudioTextPhase - Listen to the story (audio only)
 * 4. FirstRecallPhase - Rough spoken summary without transcript
 * 5. TranscriptRevealPhase - See text with vocabulary marked
 * 6. GuidedNoticingPhase - Infer meaning of new words from context
 * 7. MicroDrillsPhase - Sentence reconstruction, paraphrase, constrained output
 * 8. ShadowingPhase - Repeat audio for pronunciation practice
 * 9. SecondRecallPhase - Retell story using target vocabulary
 * 10. ProgressReflectionPhase - Metacognitive reflection on improvement
 */

// New 10-phase lesson components
export { SpacedRetrievalWarmupPhase } from "./SpacedRetrievalWarmupPhase";
export { PredictionStagePhase } from "./PredictionStagePhase";
export { AudioTextPhase } from "./AudioTextPhase";
export { FirstRecallPhase } from "./FirstRecallPhase";
export { TranscriptRevealPhase } from "./TranscriptRevealPhase";
export { GuidedNoticingPhase } from "./GuidedNoticingPhase";
export { MicroDrillsPhase } from "./MicroDrillsPhase";
export { ShadowingPhase } from "./ShadowingPhase";
export { SecondRecallPhase } from "./SecondRecallPhase";
export { ProgressReflectionPhase } from "./ProgressReflectionPhase";

// Legacy 6-phase lesson components (for backward compatibility)
export { AudioComprehensionPhase } from "./AudioComprehensionPhase";
export { VerbalCheckPhase } from "./VerbalCheckPhase";
export { ConversationFeedbackPhase } from "./ConversationFeedbackPhase";
export { TextRevealPhase } from "./TextRevealPhase";
export { InteractiveExercisesPhase } from "./InteractiveExercisesPhase";
export { FinalAssessmentPhase } from "./FinalAssessmentPhase";

// Shared components
export { LessonHeader } from "./LessonHeader";
export { default as LessonLoading } from "../ui/LoadingScreen";
export { LessonComplete } from "./LessonComplete";
