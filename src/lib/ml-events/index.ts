/* =============================================================================
   ML EVENTS — Barrel export
   
   Usage:
     import { logInteractionEvent, startSession, endSession } from "@/lib/ml-events";
============================================================================= */

export {
  logInteractionEvent,
  logInteractionEventBatch,
  startSession,
  endSession,
  getUserBaseline,
} from "./event-logger";
