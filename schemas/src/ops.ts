import { z } from "zod";
import { DateTime, Version } from "./common.ts";

/** content/runs/<date>.json — written only for runs that changed something or failed. */
export const IngestRun = z.strictObject({
  id: z.string().min(1),
  startedAt: DateTime,
  sourceCommit: z.string().regex(/^[0-9a-f]{40}$/),
  newVersions: z.array(Version),
  /** Past sections whose sourceHash changed. */
  changedVersions: z.array(Version),
  status: z.enum(["ok", "failed"]),
  errors: z.array(z.string()),
});
export type IngestRun = z.infer<typeof IngestRun>;
