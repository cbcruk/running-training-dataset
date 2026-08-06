// Hand-written declaration for the shared SVG renderer, which stays plain JS: it
// is a Node script entry as well as a browser import, and converting it would
// mean a build step for scripts/ too. See ADR 0002.
import type { Workout } from "../src/types/index.d.ts";

/** structure -> schematic SVG. Both axes are nominal; the label says so. */
export function renderWorkout(w: Workout, byId: Record<string, Workout>): string;
