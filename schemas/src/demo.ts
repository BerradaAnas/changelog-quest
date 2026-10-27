import { z } from "zod";
import { ReviewStatus, Slug } from "./common.ts";

const InputId = z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/);

/**
 * One condition. `equals` compares trimmed, case-insensitive text;
 * `matches` is a regular expression applied with the "i" flag. Exactly one is set.
 */
export const Condition = z
  .strictObject({
    input: InputId,
    equals: z.string().optional(),
    matches: z.string().optional(),
  })
  .refine((c) => (c.equals === undefined) !== (c.matches === undefined), {
    message: "set exactly one of equals / matches",
  });
export type Condition = z.infer<typeof Condition>;

/** Title, detail and trace text may contain "{{inputId}}" placeholders, filled as plain text. */
export const Outcome = z.strictObject({
  title: z.string().min(1),
  detail: z.string().min(1),
  outcome: z.enum(["success", "blocked", "info"]),
  trace: z.array(
    z.strictObject({
      who: z.string().min(1),
      text: z.string().min(1),
      code: z.boolean().optional(),
    }),
  ),
});
export type Outcome = z.infer<typeof Outcome>;

/** content/demos/<featureId>.json — scripted simulation, no AI at runtime. */
export const Demo = z.strictObject({
  featureId: Slug,
  title: z.string().min(1),
  intro: z.string().min(1),
  kind: z.enum(["choose", "type", "toggle"]),
  inputs: z
    .array(
      z.strictObject({
        id: InputId,
        label: z.string().min(1),
        options: z.array(z.string().min(1)).min(2).optional(),
        placeholder: z.string().optional(),
        /** One-tap example values for free-text inputs. */
        suggestions: z.array(z.string().min(1)).optional(),
      }),
    )
    .min(1),
  /** Checked in order; the first rule whose conditions all hold wins. */
  rules: z.array(z.strictObject({ when: z.array(Condition).min(1), show: Outcome })).min(1),
  fallback: z.strictObject({ title: z.string().min(1), detail: z.string().min(1) }),
  /** Settings snippet; "{{inputId}}" placeholders are replaced with the visitor's input as text. */
  configPreview: z.string().optional(),
  quiz: z
    .strictObject({
      question: z.string().min(1),
      options: z.array(z.string().min(1)).min(2),
      answerIndex: z.int().nonnegative(),
      explanation: z.string().min(1),
    })
    .refine((q) => q.answerIndex < q.options.length, {
      message: "answerIndex out of range",
      path: ["answerIndex"],
    }),
  status: ReviewStatus,
});
export type Demo = z.infer<typeof Demo>;
