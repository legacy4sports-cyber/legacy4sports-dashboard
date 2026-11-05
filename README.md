# Legacy4Sports finance dashboard

Static finance dashboard for Legacy4Sports, an Ontario corporation. Amounts are Canadian dollars. HST is 13%. The fiscal year used by the published page ends on December 31, 2026.

The site entry point is `index.html` at the repository root, which is what GitHub Pages serves from the `main` branch. That file is a [StatiCrypt](https://github.com/robinmoisson/staticrypt) page: AES-256 via WebCrypto, decrypted in the browser. Until the password is entered, the only visible content is the password prompt. Financial figures exist only inside the encrypted payload.

WebCrypto runs in a secure context. GitHub Pages (HTTPS) and `localhost` work. Opening `index.html` as a `file://` URL will not decrypt.

Decrypt the page in the browser. This build does not write `.staticrypt.json`, and StatiCrypt's CLI decrypt command hashes with the salt from that config file, so `staticrypt --decrypt` will not open `index.html`.

GitHub Pages was not turned on from this repository. After `index.html` is on `main`, enable Pages with the main branch and the root folder if you want it public.

## Rebuild

The build reads the gitignored file `data/dashboard-data.json`, renders `build/dashboard.template.html`, and encrypts the result to `index.html`. It does not prompt, so another agent can run it.

```bash
npm install
cp data/dashboard-data.example.json data/dashboard-data.json
# Replace the EXAMPLE placeholder figures. Do not commit that file.
DASH_PASSWORD='...' node build/build.mjs
```

`DASH_PASSWORD` is the page password. It is not stored in the repository. The build passes it to StatiCrypt through the child process environment and deletes the plaintext render in `.build/` when it finishes.

The checked-in `index.html` was encrypted from an all-zero data file. Unlocking it shows an empty dashboard (zeros and “No data yet”). Deadline reminders still appear, because they are calculated from `fiscalYearEnd`.

`data/dashboard-data.example.json` is safe to commit. Every descriptive row is marked `EXAMPLE`, and the amounts are a repeating placeholder pattern, not books.

## Do not put these in the data file

The model is summary figures only. The build rejects unknown keys, including keys that would hold:

- receipt images, receipt text, or attachments
- bank account, transit, institution, or card numbers
- a social insurance number
- vendor, customer, supplier, or employee names
- email addresses, phone numbers, or street addresses

Top vendors and top customers use a category or an anonymized label, such as `Facility rentals` or `Customer group A`. Leave the arrays empty when there is nothing to show.

## What the page shows

- Income, expenses, and net profit for month-to-date, quarter-to-date, and year-to-date. Net profit is income minus expenses.
- HST collected, input tax credits (HST paid), and net HST. Positive net HST means an amount owing to the CRA. Negative net HST means a refund.
- Expenses by category, as a donut and as bars. Categories with no amount are shown at $0.00.
- A monthly income-versus-expenses line, plus the same months listed underneath.
- Top vendors and top customers.
- Cash inflows, outflows, net cash flow, and the bank balance. The balance is a single summary number.
- Outstanding invoices: reference, generic description, dates, amount, and status. The total is the sum of those amounts.
- Needs Review and missing receipts: a count and a short generic description, with an optional amount and date.
- Upcoming deadlines for this fiscal year (see below).
- An estimated tax set-aside: `taxSetAsideRate` times year-to-date net profit when that profit is positive, otherwise $0.00. The default rate is 0.25. This is a planning estimate, not tax payable.
- Client-side downloads, with no network request: `legacy4sports-ledger-summary.csv` and `legacy4sports-hst-report.csv`.

Meals and entertainment are stored as the full book amount. The page also shows half of that amount, which is the portion generally deductible for income tax. The stored total is not reduced.

All money is CAD to the cent. An empty section shows `$0.00` and “No data yet”.

## Deadline reminders

Reminders are computed in the browser from `fiscalYearEnd`, `hstFilingFrequency`, and today’s date. They are not a filing and not tax advice. A due date that falls on a weekend, or on a holiday the CRA recognizes, moves to the next business day. The holiday set is the federal holidays the CRA uses, plus Ontario Family Day. When Christmas Day and Boxing Day crowd a weekend, the observed weekdays shift so the two holidays do not share one date.

For a corporation whose fiscal year ends on the last day of a month:

- Annual HST return and payment: three months after the fiscal year-end. `hstFilingFrequency` may instead be `quarterly` or `monthly`, in which case the return and payment are due at the end of the month after the reporting period.
- Quarterly corporate tax installments: the last day of each fiscal quarter. This schedule is for an eligible CCPC. Installments are required only when the CRA requires them.
- Monthly corporate tax installments: the last day of each month in the fiscal year, for corporations that must pay monthly.
- T2 corporate income tax return: six months after the fiscal year-end.
- Balance of corporate tax: three months after year-end when the CCPC three-month rule applies, otherwise two months. Interest runs from the balance-due date, which is earlier than the T2 filing date.

## Data file

`data/dashboard-data.json` is a single JSON object. Amounts are numbers with at most two decimal places, not strings and not cents-as-integers. Rates are decimals: `0.13` means 13%, `0.25` means 25%.

```json
{
  "businessName": "Legacy4Sports",
  "currency": "CAD",
  "province": "ON",
  "hstRate": 0.13,
  "fiscalYearEnd": "2026-12-31",
  "taxSetAsideRate": 0.25,
  "hstFilingFrequency": "annual",
  "periods": {
    "monthToDate": { "income": 0, "expenses": 0 },
    "quarterToDate": { "income": 0, "expenses": 0 },
    "yearToDate": { "income": 0, "expenses": 0 }
  },
  "hst": { "collected": 0, "itcs": 0 },
  "expensesByCategory": [
    { "category": "Advertising", "amount": 0 }
  ],
  "monthly": [
    {
      "month": "2026-01",
      "income": 0,
      "expenses": 0,
      "hstCollected": 0,
      "hstItcs": 0
    }
  ],
  "topVendors": [{ "label": "Office supplies", "amount": 0 }],
  "topCustomers": [{ "label": "League registrations", "amount": 0 }],
  "cashFlow": { "bankBalance": 0, "inflows": 0, "outflows": 0 },
  "receivables": [
    {
      "reference": "INV-1001",
      "description": "Registration fees",
      "issuedOn": "2026-01-01",
      "dueOn": "2026-01-31",
      "amount": 0,
      "status": "open"
    }
  ],
  "needsReview": [
    { "date": "2026-01-01", "description": "Uncategorized expense", "amount": 0 }
  ],
  "missingReceipts": [
    { "date": "2026-01-01", "description": "Purchase missing a receipt", "amount": 0 }
  ]
}
```

The numbers above are zeros, not books. `expensesByCategory`, `monthly`, and the list fields may be empty arrays. Omitted categories are shown as $0.00. On review items, `amount` and `date` are optional.

| Field | Meaning |
| --- | --- |
| `businessName` | Display name, up to 80 characters. |
| `currency` | Must be `CAD`. |
| `province` | Must be `ON`. |
| `hstRate` | Must be `0.13`. |
| `fiscalYearEnd` | `YYYY-MM-DD`. Drives the deadline reminders. |
| `taxSetAsideRate` | Decimal from 0 to 1. Use `0.25` for the default 25% estimate. |
| `hstFilingFrequency` | `annual`, `quarterly`, or `monthly`. |
| `periods.*.income` / `expenses` | Pre-aggregated summary for that slice of the fiscal year. The page does not derive these from `monthly`. |
| `hst.collected` | HST collected on taxable supplies, running total for the view you want on the page. |
| `hst.itcs` | Input tax credits (HST paid), same basis as `collected`. |
| `expensesByCategory` | One row per category. `category` must be one of the names below. `amount` is the book total. |
| `monthly` | `YYYY-MM` rows. `hstCollected` and `hstItcs` are optional and feed the HST CSV. |
| `topVendors` / `topCustomers` | `{ "label", "amount" }`. Labels are categories or anonymized groups. |
| `cashFlow.bankBalance` | Summary balance only. |
| `cashFlow.inflows` / `outflows` | Cash movement for the period you are summarizing. Net cash flow is inflows minus outflows. |
| `receivables` | Outstanding invoices only. `status` is `open`, `partial`, or `overdue`. `reference` and `description` stay generic. |
| `needsReview` / `missingReceipts` | Short generic descriptions. The page shows the array length as the count. |

Categories, spelled exactly this way:

- Advertising
- Meals and entertainment (50%)
- Insurance
- Interest and bank charges
- Office supplies
- Professional fees
- Rent
- Repairs and maintenance
- Salaries/subcontractors
- Travel
- Telephone and utilities
- Vehicle
- Equipment/capital
- Software and subscriptions
- Sports equipment/inventory
- League/tournament fees
- Uniforms
- Facility rentals
- Other

JSON Schema for the same object:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Legacy4Sports dashboard data",
  "type": "object",
  "additionalProperties": false,
  "required": [
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
    "missingReceipts"
  ],
  "properties": {
    "businessName": { "type": "string", "minLength": 1, "maxLength": 80 },
    "currency": { "const": "CAD" },
    "province": { "const": "ON" },
    "hstRate": { "const": 0.13 },
    "fiscalYearEnd": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
    "taxSetAsideRate": { "type": "number", "minimum": 0, "maximum": 1 },
    "hstFilingFrequency": { "enum": ["annual", "quarterly", "monthly"] },
    "periods": {
      "type": "object",
      "additionalProperties": false,
      "required": ["monthToDate", "quarterToDate", "yearToDate"],
      "properties": {
        "monthToDate": { "$ref": "#/$defs/period" },
        "quarterToDate": { "$ref": "#/$defs/period" },
        "yearToDate": { "$ref": "#/$defs/period" }
      }
    },
    "hst": {
      "type": "object",
      "additionalProperties": false,
      "required": ["collected", "itcs"],
      "properties": {
        "collected": { "$ref": "#/$defs/money" },
        "itcs": { "$ref": "#/$defs/money" }
      }
    },
    "expensesByCategory": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["category", "amount"],
        "properties": {
          "category": { "enum": [
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
            "Other"
          ] },
          "amount": { "$ref": "#/$defs/money" }
        }
      }
    },
    "monthly": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["month", "income", "expenses"],
        "properties": {
          "month": { "type": "string", "pattern": "^\\d{4}-\\d{2}$" },
          "income": { "$ref": "#/$defs/money" },
          "expenses": { "$ref": "#/$defs/money" },
          "hstCollected": { "$ref": "#/$defs/money" },
          "hstItcs": { "$ref": "#/$defs/money" }
        }
      }
    },
    "topVendors": { "$ref": "#/$defs/ranked" },
    "topCustomers": { "$ref": "#/$defs/ranked" },
    "cashFlow": {
      "type": "object",
      "additionalProperties": false,
      "required": ["bankBalance", "inflows", "outflows"],
      "properties": {
        "bankBalance": { "$ref": "#/$defs/money" },
        "inflows": { "$ref": "#/$defs/money" },
        "outflows": { "$ref": "#/$defs/money" }
      }
    },
    "receivables": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["reference", "description", "issuedOn", "dueOn", "amount", "status"],
        "properties": {
          "reference": { "type": "string", "minLength": 2, "maxLength": 40 },
          "description": { "type": "string", "minLength": 2, "maxLength": 140 },
          "issuedOn": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
          "dueOn": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
          "amount": { "$ref": "#/$defs/money" },
          "status": { "enum": ["open", "partial", "overdue"] }
        }
      }
    },
    "needsReview": { "$ref": "#/$defs/notes" },
    "missingReceipts": { "$ref": "#/$defs/notes" }
  },
  "$defs": {
    "money": {
      "type": "number",
      "description": "CAD to the cent. At most two decimal places. Negative values are allowed."
    },
    "period": {
      "type": "object",
      "additionalProperties": false,
      "required": ["income", "expenses"],
      "properties": {
        "income": { "$ref": "#/$defs/money" },
        "expenses": { "$ref": "#/$defs/money" }
      }
    },
    "ranked": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["label", "amount"],
        "properties": {
          "label": {
            "type": "string",
            "minLength": 2,
            "maxLength": 80,
            "description": "Category or anonymized label. Not a person or business name."
          },
          "amount": { "$ref": "#/$defs/money" }
        }
      }
    },
    "notes": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["description"],
        "properties": {
          "description": { "type": "string", "minLength": 2, "maxLength": 140 },
          "amount": { "$ref": "#/$defs/money" },
          "date": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$" }
        }
      }
    }
  }
}
```

`build/schema.mjs` is the check the build actually runs. It also rejects forbidden key names anywhere in the tree, social-insurance-number shaped strings, email addresses, and digit-only account-number strings.
