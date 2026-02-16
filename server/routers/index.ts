/**
 * Main tRPC Router
 * Combines all sub-routers
 */

import { router } from "../_core/trpc";
import { voximplantRouter } from "./voximplant";
import { campaignsRouter } from "./campaigns";

export const appRouter = router({
  voximplant: voximplantRouter,
  campaigns: campaignsRouter,
});

export type AppRouter = typeof appRouter;
