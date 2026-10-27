import type { Condition, Demo, Outcome } from "./demo.ts";

export type DemoInputs = Record<string, string>;

const norm = (s: string) => s.trim().toLowerCase();

function holds(c: Condition, inputs: DemoInputs): boolean {
  const value = inputs[c.input] ?? "";
  if (c.equals !== undefined) return norm(value) === norm(c.equals);
  if (c.matches !== undefined) return new RegExp(c.matches, "i").test(value);
  return false;
}

/** First matching rule's outcome, or null to show the demo's fallback. Input is never executed. */
export function runDemo(demo: Demo, inputs: DemoInputs): Outcome | null {
  for (const rule of demo.rules) {
    if (rule.when.every((c) => holds(c, inputs))) return rule.show;
  }
  return null;
}

/** Fill "{{inputId}}" placeholders with visitor text. Callers must render the result as text. */
export function renderConfigPreview(template: string, inputs: DemoInputs): string {
  return template.replace(
    /\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g,
    (_, id: string) => inputs[id] ?? "",
  );
}

/** The outcome with "{{inputId}}" placeholders filled. Callers must render it as text. */
export function fillOutcome(outcome: Outcome, inputs: DemoInputs): Outcome {
  const fill = (text: string) => renderConfigPreview(text, inputs);
  return {
    ...outcome,
    title: fill(outcome.title),
    detail: fill(outcome.detail),
    trace: outcome.trace.map((step) => ({ ...step, who: fill(step.who), text: fill(step.text) })),
  };
}

/** Every "{{inputId}}" used in an outcome. */
export function outcomePlaceholders(outcome: Outcome): string[] {
  const texts = [outcome.title, outcome.detail, ...outcome.trace.flatMap((s) => [s.who, s.text])];
  return texts.flatMap(configPreviewPlaceholders);
}

export function configPreviewPlaceholders(template: string): string[] {
  return [...template.matchAll(/\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g)].map((m) => m[1] as string);
}
