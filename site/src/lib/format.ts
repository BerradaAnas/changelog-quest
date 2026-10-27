const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const FULL = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** "Oct 9". */
export const shortDate = (iso: string) => DAY.format(new Date(iso));
/** "Oct 9, 2025", or "by Oct 9, 2025" for estimated dates (ADR 0009). */
export const releaseDate = (iso: string, estimated: boolean) =>
  `${estimated ? "by " : ""}${FULL.format(new Date(iso))}`;
/** "October 2025" from "2025-10". */
export const monthLabel = (yyyyMm: string) => MONTH.format(new Date(`${yyyyMm}-01T00:00:00Z`));
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
