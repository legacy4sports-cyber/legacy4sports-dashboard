import { adjustISO, buildDeadlines } from "./deadlines.mjs";

function expectDeadline(rows, title, due, status) {
  const row = rows.find((item) => item.title === title);
  if (!row) throw new Error(`Missing deadline: ${title}`);
  if (row.due !== due || row.status !== status) {
    throw new Error(`${title}: got ${row.due} ${row.status}, expected ${due} ${status}`);
  }
}

/** Locks the December 31, 2026 calendar used by the empty dashboard. */
export function selfCheck() {
  if (adjustISO("2026-12-25") !== "2026-12-29") {
    throw new Error(`Christmas 2026 adjustment was ${adjustISO("2026-12-25")}`);
  }
  if (adjustISO("2026-12-26") !== "2026-12-29") {
    throw new Error(`Boxing Day 2026 adjustment was ${adjustISO("2026-12-26")}`);
  }

  const annual = buildDeadlines("2026-12-31", "2026-11-05", "annual");
  expectDeadline(annual, "Annual HST return and payment", "2027-03-31", "upcoming");
  expectDeadline(annual, "Q1 installment", "2026-03-31", "passed");
  expectDeadline(annual, "Q2 installment", "2026-06-30", "passed");
  expectDeadline(annual, "Q3 installment", "2026-10-01", "passed");
  expectDeadline(annual, "Q4 installment", "2026-12-31", "upcoming");
  expectDeadline(annual, "Monthly installment — November 2026", "2026-11-30", "upcoming");
  expectDeadline(annual, "Monthly installment — December 2026", "2026-12-31", "upcoming");
  expectDeadline(annual, "Monthly installment — October 2026", "2026-11-02", "passed");
  expectDeadline(annual, "T2 corporate income tax return", "2027-06-30", "upcoming");
  expectDeadline(annual, "Corporate tax balance — CCPC (3 months)", "2027-03-31", "upcoming");
  expectDeadline(annual, "Corporate tax balance — other corporations (2 months)", "2027-03-01", "upcoming");

  const monthly = buildDeadlines("2026-12-31", "2026-11-05", "monthly");
  expectDeadline(monthly, "HST return and payment for January 2026", "2026-03-02", "passed");

  const quarterly = buildDeadlines("2026-12-31", "2026-11-05", "quarterly");
  expectDeadline(quarterly, "HST return and payment for Q1 2026", "2026-04-30", "passed");
}
