import { z } from "zod";
import { Slug, Version } from "./common.ts";

/**
 * Editorial milestone in a feature's history. Which items it relates to is derived
 * from summary classifications (featureIds), not stored here.
 */
export const FeatureEvent = z.strictObject({
  version: Version,
  type: z.enum(["introduced", "updated", "deprecated", "removed"]),
  note: z.string().min(1),
});
export type FeatureEvent = z.infer<typeof FeatureEvent>;

/** content/features/<id>.json — hand-written, reviewed. */
export const Feature = z
  .strictObject({
    id: Slug,
    name: z.string().min(1),
    area: z.enum(["core", "extend", "anywhere"]),
    summary: z.string().min(1),
    what: z.string().min(1),
    impact: z.array(z.strictObject({ title: z.string().min(1), detail: z.string().min(1) })),
    howItWorks: z.array(z.string().min(1)),
    docUrls: z.array(z.url()).min(1),
    status: z.enum(["active", "deprecated", "removed"]),
    events: z.array(FeatureEvent).min(1),
  })
  .refine((f) => f.events.filter((e) => e.type === "introduced").length === 1, {
    message: "a feature needs exactly one 'introduced' event",
    path: ["events"],
  });
export type Feature = z.infer<typeof Feature>;

/** Derived: the version a feature was introduced in. */
export function introducedIn(feature: Feature): string {
  const event = feature.events.find((e) => e.type === "introduced");
  if (!event) throw new Error(`feature ${feature.id} has no introduced event`);
  return event.version;
}
