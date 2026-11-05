/**
 * Summary-only dashboard data. No receipts, account numbers, SINs, or names.
 * The build rejects unknown keys so those details cannot be tucked into the file.
 */

export const CATEGORIES = [
  "Advertising",
  "Meals and entertainment (50%)",
  "Insurance",
  "Interest and bank charges",
  "Office supplies",
  "Professional fees",
  "Rent",
  "Repairs and maintenance",
  "Salaries/subcontractors",
  "Travel",
  "Telephone and utilities",
  "Vehicle",
  "Equipment/capital",
  "Software and subscriptions",
  "Sports equipment/inventory",
  "League/tournament fees",
  "Uniforms",
  "Facility rentals",
  "Other",
];

const CATEGORY_SET = new Set(CATEGORIES);

const FORBIDDEN_KEYS = new Set([
  "sin",
  "socialinsurance",
  "socialinsurancenumber",
  "nas",
  "account",
  "accountnumber",
  "accountno",
  "bankaccount",
  "bankaccountnumber",
  "transit",
  "transitnumber",
  "institution",
  "institutionnumber",
  "routing",
  "routingnumber",
  "iban",
  "swift",
  "micr",
  "card",
  "cardnumber",
  "pan",
  "cvv",
  "cvc",
  "receipt",
  "receiptimage",
  "receipturl",
  "attachment",
  "attachments",
  "email",
  "emailaddress",
  "phone",
  "phonenumber",
  "tel",
  "mobile",
  "address",
  "street",
  "postalcode",
  "postal",
  "zip",
  "customername",
  "vendorname",
  "suppliername",
  "payeename",
  "firstname",
  "lastname",
  "fullname",
  "legalname",
  "dob",
  "dateofbirth",
  "birthdate",
  "password",
  "secret",
  "apikey",
  "token",
]);

const TOP_LEVEL_KEYS = [
  "businessName",
  "currency",
  "province",
  "hstRate",
  "fiscalYearEnd",
  "taxSetAsideRate",
  "hstFilingFrequency",
  "periods",
  "hst",
  "expensesByCategory",
  "monthly",
  "topVendors",
  "topCustomers",
  "cashFlow",
  "receivables",
  "needsReview",
  "missingReceipts",
];

function fail(path, message) {
  throw new Error(`${path} ${message}`);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, path, allowed, optional = []) {
  if (!isPlainObject(value)) fail(path, "must be an object");
  const allowedSet = new Set(allowed);
  const optionalSet = new Set(optional);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) fail(`${path}.${key}`, "is not part of the dashboard schema");
  }
  for (const key of allowed) {
    if (!optionalSet.has(key) && !Object.prototype.hasOwnProperty.call(value, key)) {
      fail(`${path}.${key}`, "is required");
    }
  }
}

function assertMoney(value, path) {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "must be a finite number in CAD");
  const cents = value * 100;
  if (Math.abs(cents - Math.round(cents)) > 1e-6) fail(path, "must be stated to the cent");
}

function assertRate(value, path) {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "must be a number");
  if (value < 0 || value > 1) fail(path, "must be between 0 and 1");
  const units = value * 10000;
  if (Math.abs(units - Math.round(units)) > 1e-6) fail(path, "must have at most 4 decimal places");
}

function assertDate(value, path) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(path, "must be a YYYY-MM-DD date");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    fail(path, "must be a real calendar date");
  }
}

function assertMonth(value, path) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) fail(path, "must be YYYY-MM");
  const month = Number(value.slice(5));
  if (month < 1 || month > 12) fail(path, "must be a real month");
}

function assertText(value, path, min, max) {
  if (typeof value !== "string") fail(path, "must be a string");
  if (value.trim() !== value) fail(path, "must not have surrounding space");
  if (value.length < min || value.length > max) fail(path, `must be ${min} to ${max} characters`);
  if (/[\u0000-\u001f]/.test(value)) fail(path, "must not contain control characters");
  if (value.includes("@")) fail(path, "must not contain an email address");
  if (/^\d{3}[ -]\d{3}[ -]\d{3}$/.test(value)) fail(path, "must not be a social insurance number");
  if (/^\d{7,}$/.test(value.replace(/[\s-]/g, ""))) fail(path, "must not be an account number");
}

function assertNoForbiddenKeys(value, path) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenKeys(item, `${path}[${index}]`));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const key of Object.keys(value)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (FORBIDDEN_KEYS.has(normalized)) {
      fail(`${path}.${key}`, "is not allowed in the dashboard data");
    }
    assertNoForbiddenKeys(value[key], `${path}.${key}`);
  }
}

function assertPeriod(value, path) {
  assertExactKeys(value, path, ["income", "expenses"]);
  assertMoney(value.income, `${path}.income`);
  assertMoney(value.expenses, `${path}.expenses`);
}

/**
 * @param {unknown} data
 * @returns {object} the same object when it matches the schema
 */
export function validateDashboardData(data) {
  if (!isPlainObject(data)) fail("data", "must be a JSON object");
  assertNoForbiddenKeys(data, "data");
  assertExactKeys(data, "data", TOP_LEVEL_KEYS);

  assertText(data.businessName, "data.businessName", 1, 80);
  if (data.currency !== "CAD") fail("data.currency", 'must be "CAD"');
  if (data.province !== "ON") fail("data.province", 'must be "ON"');
  if (data.hstRate !== 0.13) fail("data.hstRate", "must be 0.13 (Ontario HST)");
  assertDate(data.fiscalYearEnd, "data.fiscalYearEnd");
  assertRate(data.taxSetAsideRate, "data.taxSetAsideRate");
  if (!["annual", "quarterly", "monthly"].includes(data.hstFilingFrequency)) {
    fail("data.hstFilingFrequency", 'must be "annual", "quarterly", or "monthly"');
  }

  assertExactKeys(data.periods, "data.periods", ["monthToDate", "quarterToDate", "yearToDate"]);
  assertPeriod(data.periods.monthToDate, "data.periods.monthToDate");
  assertPeriod(data.periods.quarterToDate, "data.periods.quarterToDate");
  assertPeriod(data.periods.yearToDate, "data.periods.yearToDate");

  assertExactKeys(data.hst, "data.hst", ["collected", "itcs"]);
  assertMoney(data.hst.collected, "data.hst.collected");
  assertMoney(data.hst.itcs, "data.hst.itcs");

  if (!Array.isArray(data.expensesByCategory)) fail("data.expensesByCategory", "must be an array");
  const seenCategories = new Set();
  data.expensesByCategory.forEach((row, index) => {
    const path = `data.expensesByCategory[${index}]`;
    assertExactKeys(row, path, ["category", "amount"]);
    if (!CATEGORY_SET.has(row.category)) fail(`${path}.category`, "is not a known category");
    if (seenCategories.has(row.category)) fail(`${path}.category`, "is duplicated");
    seenCategories.add(row.category);
    assertMoney(row.amount, `${path}.amount`);
  });

  if (!Array.isArray(data.monthly)) fail("data.monthly", "must be an array");
  const seenMonths = new Set();
  data.monthly.forEach((row, index) => {
    const path = `data.monthly[${index}]`;
    assertExactKeys(row, path, ["month", "income", "expenses", "hstCollected", "hstItcs"], [
      "hstCollected",
      "hstItcs",
    ]);
    assertMonth(row.month, `${path}.month`);
    if (seenMonths.has(row.month)) fail(`${path}.month`, "is duplicated");
    seenMonths.add(row.month);
    assertMoney(row.income, `${path}.income`);
    assertMoney(row.expenses, `${path}.expenses`);
    if ("hstCollected" in row) assertMoney(row.hstCollected, `${path}.hstCollected`);
    if ("hstItcs" in row) assertMoney(row.hstItcs, `${path}.hstItcs`);
  });

  for (const key of ["topVendors", "topCustomers"]) {
    if (!Array.isArray(data[key])) fail(`data.${key}`, "must be an array");
    data[key].forEach((row, index) => {
      const path = `data.${key}[${index}]`;
      assertExactKeys(row, path, ["label", "amount"]);
      assertText(row.label, `${path}.label`, 2, 80);
      assertMoney(row.amount, `${path}.amount`);
    });
  }

  assertExactKeys(data.cashFlow, "data.cashFlow", ["bankBalance", "inflows", "outflows"]);
  assertMoney(data.cashFlow.bankBalance, "data.cashFlow.bankBalance");
  assertMoney(data.cashFlow.inflows, "data.cashFlow.inflows");
  assertMoney(data.cashFlow.outflows, "data.cashFlow.outflows");

  if (!Array.isArray(data.receivables)) fail("data.receivables", "must be an array");
  data.receivables.forEach((row, index) => {
    const path = `data.receivables[${index}]`;
    assertExactKeys(row, path, ["reference", "description", "issuedOn", "dueOn", "amount", "status"]);
    assertText(row.reference, `${path}.reference`, 2, 40);
    assertText(row.description, `${path}.description`, 2, 140);
    assertDate(row.issuedOn, `${path}.issuedOn`);
    assertDate(row.dueOn, `${path}.dueOn`);
    assertMoney(row.amount, `${path}.amount`);
    if (!["open", "partial", "overdue"].includes(row.status)) {
      fail(`${path}.status`, 'must be "open", "partial", or "overdue"');
    }
  });

  for (const key of ["needsReview", "missingReceipts"]) {
    if (!Array.isArray(data[key])) fail(`data.${key}`, "must be an array");
    data[key].forEach((row, index) => {
      const path = `data.${key}[${index}]`;
      assertExactKeys(row, path, ["description", "amount", "date"], ["amount", "date"]);
      assertText(row.description, `${path}.description`, 2, 140);
      if ("amount" in row) assertMoney(row.amount, `${path}.amount`);
      if ("date" in row) assertDate(row.date, `${path}.date`);
    });
  }

  return data;
}
