/**
 * Calendar reminders for an Ontario corporation.
 * These are not a filing and not tax advice. Due dates that land on a weekend
 * or a holiday the CRA recognizes move to the next business day.
 *
 * Holiday set: federal holidays the CRA uses, plus Ontario Family Day.
 * When Christmas and Boxing Day crowd a weekend, the observed weekday shifts
 * forward so the two holidays do not share one day.
 */

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function parseISODate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Bad date: ${iso}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Invalid date: ${iso}`);
  }
  return date;
}

export function formatISODate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLongDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

export function formatMonth(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addMonths(date, months) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(year, month + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target;
}

function isMonthEnd(date) {
  return addDays(date, 1).getUTCMonth() !== date.getUTCMonth();
}

/** Month-end year-ends land on the target month-end. Other dates keep the day. */
function addMonthsCRA(date, months) {
  if (!isMonthEnd(date)) return addMonths(date, months);
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return addDays(addMonths(first, months + 1), -1);
}

function endOfFollowingMonth(date) {
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return addDays(addMonths(first, 2), -1);
}

function nthWeekday(year, month, weekday, n) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const delta = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month - 1, 1 + delta + (n - 1) * 7));
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function victoriaDay(year) {
  const may24 = new Date(Date.UTC(year, 4, 24));
  const sinceMonday = (may24.getUTCDay() - 1 + 7) % 7;
  return addDays(may24, -sinceMonday);
}

const holidayCache = new Map();

function holidaySet(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);
  const easter = easterSunday(year);
  const statutory = [
    new Date(Date.UTC(year, 0, 1)),
    nthWeekday(year, 2, 1, 3),
    addDays(easter, -2),
    addDays(easter, 1),
    victoriaDay(year),
    new Date(Date.UTC(year, 6, 1)),
    nthWeekday(year, 9, 1, 1),
    new Date(Date.UTC(year, 8, 30)),
    addDays(nthWeekday(year, 10, 1, 1), 7),
    new Date(Date.UTC(year, 10, 11)),
    new Date(Date.UTC(year, 11, 25)),
    new Date(Date.UTC(year, 11, 26)),
  ].sort((a, b) => a.getTime() - b.getTime());

  const occupied = new Set();
  const result = new Set();
  for (const date of statutory) {
    result.add(formatISODate(date));
    let observed = date;
    const weekday = observed.getUTCDay();
    if (weekday === 6) observed = addDays(observed, 2);
    else if (weekday === 0) observed = addDays(observed, 1);
    while (occupied.has(formatISODate(observed))) {
      observed = addDays(observed, 1);
      const nextWeekday = observed.getUTCDay();
      if (nextWeekday === 6) observed = addDays(observed, 2);
      else if (nextWeekday === 0) observed = addDays(observed, 1);
    }
    occupied.add(formatISODate(observed));
    result.add(formatISODate(observed));
  }
  holidayCache.set(year, result);
  return result;
}

function isWeekend(date) {
  const weekday = date.getUTCDay();
  return weekday === 0 || weekday === 6;
}

export function adjustToBusinessDay(date) {
  let cursor = date;
  while (isWeekend(cursor) || holidaySet(cursor.getUTCFullYear()).has(formatISODate(cursor))) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

export function adjustISO(iso) {
  return formatISODate(adjustToBusinessDay(parseISODate(iso)));
}

function fiscalYearStart(fiscalYearEnd) {
  return addDays(addMonths(fiscalYearEnd, -12), 1);
}

function quarterEnds(fiscalYearEnd) {
  const start = fiscalYearStart(fiscalYearEnd);
  return [1, 2, 3, 4].map((quarter) => addDays(addMonths(start, quarter * 3), -1));
}

function monthEnds(fiscalYearEnd) {
  const ends = [];
  let cursor = fiscalYearStart(fiscalYearEnd);
  while (cursor.getTime() <= fiscalYearEnd.getTime()) {
    const first = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
    let end = addDays(addMonths(first, 1), -1);
    if (end.getTime() > fiscalYearEnd.getTime()) end = fiscalYearEnd;
    ends.push(end);
    cursor = addDays(end, 1);
  }
  return ends;
}

function pushDeadline(rows, group, title, nominalDate, today, detail) {
  const adjusted = adjustToBusinessDay(nominalDate);
  const nominal = formatISODate(nominalDate);
  const due = formatISODate(adjusted);
  let fullDetail = detail;
  if (due !== nominal) {
    fullDetail += ` The calendar date was ${formatLongDate(nominal)}; it moves to the next business day.`;
  }
  let status = "upcoming";
  if (due === today) status = "today";
  else if (due < today) status = "passed";
  rows.push({ group, title, due, nominal, status, detail: fullDetail });
}

/**
 * @param {string} fiscalYearEnd YYYY-MM-DD
 * @param {string} today YYYY-MM-DD, the viewer's local date
 * @param {"annual"|"quarterly"|"monthly"} hstFilingFrequency
 */
export function buildDeadlines(fiscalYearEnd, today, hstFilingFrequency) {
  const yearEnd = parseISODate(fiscalYearEnd);
  const rows = [];
  const quarters = quarterEnds(yearEnd);
  const months = monthEnds(yearEnd);

  if (hstFilingFrequency === "annual") {
    pushDeadline(
      rows,
      "hst",
      "Annual HST return and payment",
      addMonthsCRA(yearEnd, 3),
      today,
      "For a corporation filing HST annually, the return and the payment are both due three months after the fiscal year-end.",
    );
  } else if (hstFilingFrequency === "quarterly") {
    quarters.forEach((end, index) => {
      pushDeadline(
        rows,
        "hst",
        `HST return and payment for Q${index + 1} ${end.getUTCFullYear()}`,
        endOfFollowingMonth(end),
        today,
        `Reporting period ending ${formatLongDate(formatISODate(end))}.`,
      );
    });
  } else if (hstFilingFrequency === "monthly") {
    months.forEach((end) => {
      const label = formatMonth(formatISODate(end).slice(0, 7));
      pushDeadline(
        rows,
        "hst",
        `HST return and payment for ${label}`,
        endOfFollowingMonth(end),
        today,
        `Reporting period ending ${formatLongDate(formatISODate(end))}.`,
      );
    });
  } else {
    throw new Error(`Unknown HST filing frequency: ${hstFilingFrequency}`);
  }

  quarters.forEach((end, index) => {
    pushDeadline(
      rows,
      "installmentQuarterly",
      `Q${index + 1} installment`,
      end,
      today,
      "Quarterly corporate tax installment, due on the last day of the fiscal quarter.",
    );
  });

  months.forEach((end) => {
    const label = formatMonth(formatISODate(end).slice(0, 7));
    pushDeadline(
      rows,
      "installmentMonthly",
      `Monthly installment — ${label}`,
      end,
      today,
      "Monthly corporate tax installment, due on the last day of the month.",
    );
  });

  pushDeadline(
    rows,
    "t2",
    "T2 corporate income tax return",
    addMonthsCRA(yearEnd, 6),
    today,
    "File the T2 within six months of the fiscal year-end. The balance of tax is due earlier.",
  );

  pushDeadline(
    rows,
    "balance",
    "Corporate tax balance — CCPC (3 months)",
    addMonthsCRA(yearEnd, 3),
    today,
    "Use this date when the corporation qualifies for the three-month balance-due date.",
  );
  pushDeadline(
    rows,
    "balance",
    "Corporate tax balance — other corporations (2 months)",
    addMonthsCRA(yearEnd, 2),
    today,
    "Use this date when the three-month balance-due date does not apply.",
  );

  return rows;
}
