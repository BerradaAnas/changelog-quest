import type { Demo, Outcome } from "@cq/schemas";
import { fillOutcome, renderConfigPreview, runDemo } from "@cq/schemas/demo-engine";
import { markTried } from "../lib/progress.ts";
import { loadProgress, saveProgress } from "./store.ts";

/** The demo as sent to the browser: the quiz is not shown on the site. */
type ClientDemo = Omit<Demo, "quiz">;

/**
 * Runs scripted demos in the browser. Visitor input is only matched against the demo's rules
 * and shown back with textContent: it is never executed, inserted as HTML, or sent anywhere.
 */

const OUTCOME_LABELS: Record<Outcome["outcome"], string> = {
  success: "Goes ahead",
  blocked: "Blocked",
  info: "Good to know",
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderOutcome(target: HTMLElement, outcome: Outcome | null, demo: ClientDemo) {
  const kind = outcome?.outcome ?? "info";
  const nodes: HTMLElement[] = [
    el("span", `badge ${kind}`, outcome ? OUTCOME_LABELS[kind] : "Not scripted"),
    el("h3", "", outcome?.title ?? demo.fallback.title),
    el("p", "", outcome?.detail ?? demo.fallback.detail),
  ];
  if (outcome && outcome.trace.length > 0) {
    const list = el("ol", "trace");
    for (const step of outcome.trace) {
      const item = el("li", "");
      item.append(el("span", "who", step.who), el(step.code ? "code" : "span", "", step.text));
      list.append(item);
    }
    nodes.push(list);
  }
  target.replaceChildren(...nodes);
  target.hidden = false;
}

function setUp(root: HTMLElement) {
  const demo = JSON.parse(root.dataset.demo ?? "null") as ClientDemo | null;
  const form = root.querySelector<HTMLFormElement>("[data-demo-form]");
  const outcome = root.querySelector<HTMLElement>("[data-demo-outcome]");
  if (!demo || !form || !outcome) return;
  const config = root.querySelector<HTMLElement>("[data-demo-config]");

  const inputs = () => {
    const data = new FormData(form);
    return Object.fromEntries(demo.inputs.map((i) => [i.id, String(data.get(i.id) ?? "")]));
  };
  const showConfig = () => {
    if (config && demo.configPreview) {
      config.textContent = renderConfigPreview(demo.configPreview, inputs());
    }
  };

  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-suggest]")) {
    button.addEventListener("click", () => {
      const field = form.elements.namedItem(button.dataset.suggest ?? "");
      if (field instanceof HTMLInputElement) {
        field.value = button.dataset.value ?? "";
        form.requestSubmit();
      }
    });
  }
  form.addEventListener("input", showConfig);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = inputs();
    const matched = runDemo(demo, values);
    renderOutcome(outcome, matched ? fillOutcome(matched, values) : null, demo);
    showConfig();
    if (matched) saveProgress(markTried(loadProgress(), demo.featureId));
  });

  root.dataset.ready = "true";
}

for (const root of document.querySelectorAll<HTMLElement>("[data-demo]")) setUp(root);
