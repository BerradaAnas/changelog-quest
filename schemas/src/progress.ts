import { z } from "zod";
import { Slug } from "./common.ts";

export const LOCAL_PROGRESS_KEY = "changelog-quest:progress";

/** Visitor progress, stored only in localStorage. Bump `v` and migrate on shape changes. */
export const LocalProgress = z.strictObject({
  v: z.literal(1),
  tried: z.array(Slug),
  quiz: z.record(Slug, z.boolean()),
  theme: z.enum(["system", "light", "dark"]),
});
export type LocalProgress = z.infer<typeof LocalProgress>;

export const emptyProgress = (): LocalProgress => ({ v: 1, tried: [], quiz: {}, theme: "system" });
