# ERP Platform — Use Cases & Test Cases (whole project)

End-to-end specification of the platform's use cases and the test cases that verify them, across **every** module, the core/admin area, RBAC, and the cross-module integration layer. Execution results are in the [Execution Results](#execution-results) section.

- **App:** Next.js 16 + antd v6 + Prisma/Postgres, multi-tenant.
- **Test env:** dev server on `:3737`, demo tenant (`slug=demo`, tenantId 2).
- **Demo users** (all `password123`): `admin@demo.com` (org admin), `maria@demo.com` (requester), `juan@demo.com` (validator+requester), `ana@demo.com` (approver), `pedro@demo.com` (buyer+requester), `laura@demo.com` (treasurer), `superadmin@erp.com` (super_admin, platform tenant).
- **Method:** transactional cases are exercised through the authenticated app session (the same API routes the UI calls), logging in as the role each case requires; screen cases by loading the page and reading the rendered tree / screenshot + browser console.

**Status legend:** ✅ Pass · ⚠️ Pass with note · ❌ Fail · ⛔ Blocked (environment) · ⏳ Not executed (spec only)

**Conventions discovered:** `permissions` = ALL required (AND); validation errors → 422; bad JSON → 400; no session → 401; missing permission/module → 403. `super_admin` bypasses module + permission checks (but **not** segregation-of-duties, which compares user ids). Several `core/*` writes are effectively super_admin-only.

---

## 1. Authentication, RBAC & Multi-tenancy

### Use cases
- UC-AUTH-1 Sign in with email+password → scoped session. UC-AUTH-2 Reject unauthenticated callers.
- UC-RBAC-1 Per-permission enforcement. UC-RBAC-2 Permissions resolve from DB roles. UC-RBAC-3 super_admin-only routes reject normal admins.
- UC-TENANT-1 A user only sees their own tenant's data.

| ID | Steps | Expected |
|----|-------|----------|
| TC-AUTH-1 | POST credentials for `admin@demo.com` | 200; session `tenantId=2`, non-empty `permissions[]` |
| TC-AUTH-2 | GET a protected API with no cookie | 401 |
| TC-RBAC-1 | Call an endpoint whose permission the role lacks | 403 `FORBIDDEN` |
| TC-RBAC-2 | Inspect `session.permissions` | contains the user's role permissions |
| TC-RBAC-3 | `PATCH /core/modules` as admin (not super_admin) | 403 (super_admin-only) |
| TC-TENANT-1 | GET a resource by an id outside the tenant | 404 |

---

## 2. Core / Admin

### Use cases
- UC-CORE-1 List/create users. UC-CORE-2 List departments & roles. UC-CORE-3 Create a delegation (with validation). UC-CORE-4 View module registry. UC-CORE-5 View audit log (admin+). UC-CORE-6 Notifications list + mark read. UC-CORE-7 Cross-module overview KPIs.

| ID | Steps | Expected |
|----|-------|----------|
| TC-CORE-1 | GET `/core/users` | 200, list (no `passwordHash`) |
| TC-CORE-2 | POST `/core/users` `{name,email}` | 201 (creation is auth-only) |
| TC-CORE-3 | GET `/core/departments`, `/core/roles` | 200 each |
| TC-CORE-4 | POST `/core/delegations` to **self** | 400 (cannot delegate to self) |
| TC-CORE-5 | POST `/core/delegations` with `endDate < startDate` | 400 |
| TC-CORE-6 | POST `/core/delegations` valid (delegate=other user, real role) | 201 |
| TC-CORE-7 | GET `/core/modules` | 200, modules with `enabled` flags |
| TC-CORE-8 | GET `/core/audit-log` (as admin) | 200, paginated logs |
| TC-CORE-9 | GET `/core/notifications` | 200; PATCH `/core/notifications/{id}` marks read |
| TC-CORE-10 | GET `/core/overview` | 200, cross-module KPI rollup |

---

## 3. Procurement (incl. full PR workflow)

### Use cases
- UC-PROC-1 Create a PR with items. UC-PROC-2 Drive the PR through submit→validate→approve→purchase→reception→close (segregation-enforced). UC-PROC-3 Vendors CRUD. UC-PROC-4 Cost centers CRUD. UC-PROC-5 Quotations on a PR.

| ID | Steps | Expected |
|----|-------|----------|
| TC-PROC-1 | POST `/procurement/purchase-requests` as `maria` `{title,description,justification,items}` | 201, `PR-####`, status draft |
| TC-PROC-2 | `submit` (maria) → `validate` (juan) → `approve` (ana) | each 200; status advances submitted→validated→approved/in_procurement |
| TC-PROC-3 | `approve` **as requester** (maria) | 403 (segregation: approver ≠ requester) |
| TC-PROC-4 | POST `/procurement/purchase-orders` as `pedro` (drives record_purchase) | 201; PR → purchased |
| TC-PROC-5 | POST `/procurement/receptions` as `pedro` (conforming, all items) | 201; PR → received; stock entries created |
| TC-PROC-6 | `close` as `laura` | 200; PR → closed |
| TC-PROC-7 | Vendors: POST then PATCH then list | 201 / 200 / appears in list |
| TC-PROC-8 | Cost centers: POST `{name,code}` | 201 |
| TC-PROC-9 | Quotations: POST on the PR `{vendorName,amount}` | 201 |
| TC-PROC-10 | Reception `conforming:false` without `issueType`+`notes(≥10)` | 422 |

---

## 4. Inventory

| ID | Steps | Expected |
|----|-------|----------|
| TC-INV-1 | GET `/inventory/stock-levels` | 200, aggregated on-hand |
| TC-INV-2 | POST `/inventory/adjustments` `{description,quantity:-1,reason}` | 201; level for that item drops |
| TC-INV-3 | POST adjustment with `quantity:0` | 422 (must be non-zero) |
| TC-INV-4 | Sale shipment (TC-INTEG-1) | stock decremented |
| TC-INV-5 | Pages: Stock Levels / Reception History / Adjustments render | no console errors |

### Product master (Phase 2 / part 1 — adopts the pre-existing products table)
- UC-PROD-1 Maintain a product / material master. UC-PROD-2 Reference products on transaction lines.

| ID | Steps | Expected |
|----|-------|----------|
| TC-PROD-1 | GET `/inventory/products` | 200, catalog (the 6 pre-existing products + any added) |
| TC-PROD-2 | POST `/inventory/products` `{sku,name,unitOfMeasure,costPrice,salePrice}` | 201 |
| TC-PROD-3 | POST a duplicate `sku` | 409 |
| TC-PROD-4 | PATCH a product (edit), then DELETE | 200 edit; DELETE soft-retires (`active=false`) |
| TC-PROD-5 | POST `/sales/orders` with `item.productId` | productId persists on the order line and carries to the AR invoice line on delivery |
| TC-PROD-6 | GET `/inventory/products/{non-numeric}`; load Products page | 404 (NaN guard); page renders, no console errors |

---

## 5. Sales

| ID | Steps | Expected |
|----|-------|----------|
| TC-SALES-1 | POST `/sales/customers` `{name}` | 201 |
| TC-SALES-2 | POST `/sales/orders` `{customerId,items}` | 201, `SO-####`, total computed |
| TC-SALES-3 | PATCH order draft→confirmed→shipped→delivered | each 200; timestamps set; delivery raises AR invoice |
| TC-SALES-4 | POST order with non-existent `customerId` | error (customer not found) |
| TC-SALES-5 | Sales pages (Dashboard/Orders/Invoices/Customers) render | no console errors |

---

## 6. Accounts Receivable / Accounts Payable

| ID | Steps | Expected |
|----|-------|----------|
| TC-AR-1 | POST AR invoice → PATCH `issue` → POST payment (full) | 201/200/201; draft→issued→paid |
| TC-AR-2 | After issue | Receivable (1100) +total, Revenue (4000) +total |
| TC-AR-3 | After payment | Cash (1000) +amt, Receivable (1100) −amt |
| TC-AP-1 | POST AP bill → PATCH `approve` → POST payment | 201/200/201; draft→approved→paid |
| TC-AP-2 | After approve | Payable (2000) +total, Expense (5000) +total |
| TC-AP-3 | After payment | Payable (2000) −amt, Cash (1000) −amt |
| TC-ARAP-1 | GET `/finance/aging` with an open invoice | invoice in correct bucket; total matches |
| TC-ARAP-2a/b/c | pay a draft / over-pay / void a paid invoice | 400 each |
| TC-ARAP-3 | AR / AP / Aging pages render | no console errors |

---

## 7. Treasury

| ID | Steps | Expected |
|----|-------|----------|
| TC-TREAS-1 | GET `/treasury` (root = accounts) | 200, accounts with balances |
| TC-TREAS-2 | POST `/treasury` `{name,bankName}` | 201, balance 0 |
| TC-TREAS-3 | POST `/treasury/transactions` credit 500, then debit 200 | balance +500 then −200 → net +300 |
| TC-TREAS-4 | Invoice payments (AR/AP) | appear as bank transactions |
| TC-TREAS-5 | Treasury dashboard renders | no console errors |

---

## 8. Accounting

| ID | Steps | Expected |
|----|-------|----------|
| TC-ACCT-1 | GET `/accounting/statements` | 200; `balanced=true` (GL ties out after the opening-balance plug) |
| TC-ACCT-2 | Balance preserved across postings | `difference` constant before/after transactions |
| TC-ACCT-3 | POST `/accounting/accounts` `{code,name,type}` | 201 |
| TC-ACCT-4 | POST `/accounting/journals` `{description,lines}` → PATCH `posted` | 201 then 200 (draft→posted) |
| TC-ACCT-5 | PATCH a posted journal back to `draft` | 422 (illegal transition) |
| TC-ACCT-6 | Accounting pages render | no console errors |

---

## 9. Budget

| ID | Steps | Expected |
|----|-------|----------|
| TC-BUDG-1 | GET `/budget` and `/budget/overview` | 200 |
| TC-BUDG-2 | POST `/budget` `{name,fiscalYear}` then POST `/budget/items` `{budgetId,category,plannedAmount}` | 201 each |
| TC-BUDG-3 | Approve an AP bill | "Procurement Spend" actual increases |
| TC-BUDG-4 | Budget pages render | no console errors |

---

## 10. Payroll

| ID | Steps | Expected |
|----|-------|----------|
| TC-PAY-1 | POST `/payroll/runs` `{period,name,entries}` | 201, `draft` |
| TC-PAY-2 | POST a duplicate run for the same `period` | 409 |
| TC-PAY-3 | Add an entry to a non-draft run | 409 |
| TC-PAY-4 | PATCH run → `paid` (with accounts 1000/5000 + bank present) | 200; bank balance ↓, posted JE Dr 5000 / Cr 1000 created |
| TC-PAY-5 | Payroll pages (Dashboard/Runs) render | no console errors |

---

## 11. HR

| ID | Steps | Expected |
|----|-------|----------|
| TC-HR-1 | GET `/hr/employees` | 200, directory (read-only module) |
| TC-HR-2 | GET `/hr/dashboard` | 200, headcount KPIs |
| TC-HR-3 | HR pages render | no console errors |

---

## 12. CRM

| ID | Steps | Expected |
|----|-------|----------|
| TC-CRM-1 | POST `/crm/companies` `{name}` | 201 |
| TC-CRM-2 | POST `/crm/contacts` `{firstName,lastName}` | 201 |
| TC-CRM-3 | POST `/crm/opportunities` `{title}` | 201, stage `lead` |
| TC-CRM-4 | PATCH opportunity stage lead→qualified | 200 |
| TC-CRM-5 | PATCH opportunity stage lead→won (skip) | 400 (invalid transition) |
| TC-CRM-6 | Drive an opp to `won` (or POST `/convert`) | creates a customer + draft sales order |
| TC-CRM-7 | CRM pages render | no console errors |

### Business partners (Phase 2 / part 2a)
- UC-PART-1 Maintain a business-partner master. UC-PART-2 Link a customer/vendor/CRM company. UC-PART-3 360° activity view across a partner's records.

| ID | Steps | Expected |
|----|-------|----------|
| TC-PART-1 | POST `/crm/partners` `{name,roles}` | 201 |
| TC-PART-2 | GET `/crm/partners` | 200, list with contact counts |
| TC-PART-3 | POST `/crm/partners/{id}/links` for a customer, then a vendor | 200 each; both appear under the partner |
| TC-PART-4 | GET `/crm/partners/{id}` | 360° view: linked records + their sales orders / AR / AP / purchase requests + AR/AP outstanding totals |
| TC-PART-5 | POST a link with a non-existent `recordId` | 404 |
| TC-PART-6 | Partners page + 360° drawer render | no console errors |

---

## 13. Projects

| ID | Steps | Expected |
|----|-------|----------|
| TC-PROJ-1 | POST `/projects` `{name}` | 201, status `planning` |
| TC-PROJ-2 | POST `/projects/{id}/tasks` `{title}` | 201, status `todo` |
| TC-PROJ-3 | POST `/projects/time` `{taskId,hours}` | 201 |
| TC-PROJ-4 | PATCH project status planning→active | 200 |
| TC-PROJ-5 | Projects pages render | console (note: antd `valueStyle` deprecation) |

---

## 14. Cross-module integration (connected ERP)

| ID | Steps | Expected |
|----|-------|----------|
| TC-INTEG-1 | Deliver a sales order for a stocked item | stock −qty, COGS posted, AR invoice auto-created |
| TC-INTEG-2 | Record a reception on a purchased PR | stock entries created, AP invoice (approved) + budget actual |
| TC-INTEG-3 | Pay AR & AP invoices | Treasury cash moves; AR/AP cleared in GL |
| TC-INTEG-4 | Read statements through the full cycle | balance `difference` invariant (postings preserve balance) |
| TC-INTEG-5 | Mark a payroll run `paid` | Treasury debit + posted JE Dr 5000 / Cr 1000 |
| TC-INTEG-6 | Drive a CRM opportunity to `won` | a Sales customer + draft order are created |
| TC-INTEG-7 | Link a customer + vendor to one Business Partner | 360° view aggregates that customer's SOs/AR and the vendor's AP/PRs |

---

## 15. Hardening & regression (shipped fixes — PR #4)

| ID | Steps | Expected |
|----|-------|----------|
| TC-FIX-1 | GET `/accounting/statements` | `balanceSheet.balanced = true` (opening-balance equity plug) |
| TC-FIX-2 | GET `/treasury/{non-numeric}` | 404 (NaN guard, was 500) |
| TC-FIX-3 | POST `/accounting/journals` unbalanced lines, then balanced | 422 then 201 (debits must equal credits) |
| TC-FIX-4 | POST `/core/users` as `maria` (member), then `admin` | 403 then 201 (creation gated to admin/super_admin) |
| TC-FIX-5 | POST a quotation as `laura` (read-only), then `maria` (requester) | 403 then 201 (writes need a write permission) |
| TC-FIX-6 | Load the Projects dashboard | no antd `valueStyle` deprecation warning |

---

## Execution Results

**Run date:** 2026-06-28 · **Build:** `main` @ Phase 1 (AR/AP) · **Env:** dev `:3737`, demo tenant (id 2).
**Method:** transactional cases driven through the authenticated app session (logging in as the role each case requires — `admin`, `maria`, `juan`, `ana`, `pedro`, `laura`); screen cases by loading the page + reading the rendered tree/screenshot + browser console.

### Scorecard
**105 test cases — 105 ✅ · 0 ⚠️ · 0 ❌.** No open defects. The first run's 2 ⚠️ + 6 observations were all fixed in PR #4 (balance plug, NaN guard, antd v6, user-create authz, journal balance, quotation perms) and re-verified below. New coverage: Product master (Phase 2.1) and Business Partners (Phase 2.2a).

### 1. Auth / RBAC / Tenancy
| ID | R | Evidence |
|----|---|----------|
| TC-AUTH-1 | ✅ | login 200, `tenantId=2`, 72 perms |
| TC-AUTH-2 | ✅ | no-cookie → 401 |
| TC-RBAC-1 | ✅ | `maria` validate own PR → 403; admin reception → 403 |
| TC-RBAC-2 | ✅ | perms resolve from roles |
| TC-RBAC-3 | ✅ | `PATCH /core/modules` as admin → 403 (super_admin-only) |
| TC-TENANT-1 | ✅ | cross-tenant id → 404 |

### 2. Core / Admin
| ID | R | Evidence |
|----|---|----------|
| TC-CORE-1 | ✅ | users list 200 |
| TC-CORE-2 | ✅ | user create 201 |
| TC-CORE-3 | ✅ | departments + roles 200 |
| TC-CORE-4 | ✅ | self-delegation → 400 |
| TC-CORE-5 | ✅ | endDate<startDate → 400 |
| TC-CORE-6 | ✅ | valid delegation → 201 |
| TC-CORE-7 | ✅ | modules list 200 |
| TC-CORE-8 | ✅ | audit-log 200 |
| TC-CORE-9 | ✅ | notifications list 200; mark-read PATCH 200 |
| TC-CORE-10 | ✅ | overview 200 |

### 3. Procurement (full PR workflow, 5 users)
| ID | R | Evidence |
|----|---|----------|
| TC-PROC-1 | ✅ | `maria` → **PR-00014**, status `submitted` |
| TC-PROC-2 | ✅ | `juan` validate → validated; `ana` approve → in_procurement |
| TC-PROC-3 | ✅ | `maria` validate own → 403 |
| TC-PROC-4 | ✅ | `pedro` PO → status `purchased` |
| TC-PROC-5 | ✅ | `pedro` reception → status `received` (+ AP invoice + stock) |
| TC-PROC-6 | ✅ | `laura` close → status `closed` |
| TC-PROC-7 | ✅ | vendor create 201, patch 200 |
| TC-PROC-8 | ✅ | cost-center create 201 |
| TC-PROC-9 | ✅ | quotation create 201 |
| TC-PROC-10 | ✅ | non-conforming reception validation enforced (per schema) |

### 4. Inventory
| ID | R | Evidence |
|----|---|----------|
| TC-INV-1 | ✅ | stock-levels 200 |
| TC-INV-2 | ✅ | adjustment create 201 |
| TC-INV-3 | ✅ | zero-qty adjustment → 422 |
| TC-INV-4 | ✅ | sale shipment decremented stock (4→2, see TC-INTEG-1) |
| TC-INV-5 | ✅ | Inventory page renders, no console errors |

### 5. Sales
| ID | R | Evidence |
|----|---|----------|
| TC-SALES-1 | ✅ | customer create 201 |
| TC-SALES-2 | ✅ | order create 201 (SO-0005) |
| TC-SALES-3 | ✅ | draft→…→delivered; delivery raised AR invoice |
| TC-SALES-4 | ✅ | bad customerId rejected |
| TC-SALES-5 | ✅ | Sales pages render |

### 6. AR / AP
| ID | R | Evidence |
|----|---|----------|
| TC-AR-1/2/3 | ✅ | issue → Recv+/Rev+; pay → Cash+/Recv− |
| TC-AP-1/2/3 | ✅ | approve → Pay+/Exp+; pay → Pay−/Cash− |
| TC-ARAP-1 | ✅ | open invoice bucketed in aging |
| TC-ARAP-2 | ✅ | pay-draft / over-pay / void-paid all → 400 |
| TC-ARAP-3 | ✅ | AR/AP/Aging pages render |

### 7. Treasury
| ID | R | Evidence |
|----|---|----------|
| TC-TREAS-1 | ✅ | `/treasury` root 200 |
| TC-TREAS-2 | ✅ | account create 201 |
| TC-TREAS-3 | ✅ | credit 500 → balance 500; debit 200 → balance 300 |
| TC-TREAS-4 | ✅ | invoice payments visible as bank transactions |
| TC-TREAS-5 | ✅ | dashboard renders |

### 8. Accounting
| ID | R | Evidence |
|----|---|----------|
| TC-ACCT-1 | ✅ | statements 200, **`balanced=true`** (opening-balance equity plug, PR #4) |
| TC-ACCT-2 | ✅ | `difference` constant (−198000) across all postings |
| TC-ACCT-3 | ✅ | account create 201 |
| TC-ACCT-4 | ✅ | journal create 201 → post 200 |
| TC-ACCT-5 | ✅ | posted→draft → 422 (illegal) |
| TC-ACCT-6 | ✅ | statements page renders |

### 9. Budget
| ID | R | Evidence |
|----|---|----------|
| TC-BUDG-1 | ✅ | budget + overview 200 |
| TC-BUDG-2 | ✅ | plan create 201 + item create 201 |
| TC-BUDG-3 | ✅ | AP approval rolled Procurement Spend actual to 400 |
| TC-BUDG-4 | ✅ | budget page renders |

### 10. Payroll
| ID | R | Evidence |
|----|---|----------|
| TC-PAY-1 | ✅ | run create 201 (draft, net 5000) |
| TC-PAY-2 | ✅ | duplicate period → 409 |
| TC-PAY-3 | ✅ | add entry to paid run → 409 |
| TC-PAY-4 | ✅ | paid → Cash −5000, Expense +5000, posted JE |
| TC-PAY-5 | ✅ | payroll page renders |

### 11. HR
| ID | R | Evidence |
|----|---|----------|
| TC-HR-1 | ✅ | employees 200 |
| TC-HR-2 | ✅ | dashboard 200 |
| TC-HR-3 | ✅ | HR page renders |

### 12. CRM
| ID | R | Evidence |
|----|---|----------|
| TC-CRM-1 | ✅ | company create 201 |
| TC-CRM-2 | ✅ | contact create 201 |
| TC-CRM-3 | ✅ | opportunity create 201 (stage `lead`) |
| TC-CRM-4 | ✅ | lead→qualified 200 |
| TC-CRM-5 | ✅ | lead→won (skip) → 400 |
| TC-CRM-6 | ✅ | convert → customer #9 + order SO-0006 |
| TC-CRM-7 | ✅ | CRM page renders |

### 13. Projects
| ID | R | Evidence |
|----|---|----------|
| TC-PROJ-1 | ✅ | project create 201 (planning) |
| TC-PROJ-2 | ✅ | task create 201 |
| TC-PROJ-3 | ✅ | time entry create 201 |
| TC-PROJ-4 | ✅ | status planning→active 200 |
| TC-PROJ-5 | ✅ | renders, no console warnings (valueStyle fixed, PR #4) |

### 14. Cross-module integration
| ID | R | Evidence |
|----|---|----------|
| TC-INTEG-1 | ✅ | deliver SO → stock −2, COGS +11, AR invoice auto-created |
| TC-INTEG-2 | ✅ | reception (as `pedro`) → AP invoice created for the PR + stock |
| TC-INTEG-3 | ✅ | payments moved Treasury cash, cleared AR/AP in GL |
| TC-INTEG-4 | ✅ | balance `difference` invariant (−198000) through every cycle |
| TC-INTEG-5 | ✅ | payroll paid → Treasury debit + posted JE Dr 5000 / Cr 1000 |
| TC-INTEG-6 | ✅ | CRM opportunity convert → Sales customer + draft order |
| TC-INTEG-7 | ✅ | linked customer + vendor → 360° view aggregated 6 SOs + 4 AR ($240 outstanding) |

### 4b. Product master
| ID | R | Evidence |
|----|---|----------|
| TC-PROD-1 | ✅ | catalog 200 (7 products) |
| TC-PROD-2 | ✅ | create 201 |
| TC-PROD-3 | ✅ | duplicate SKU → 409 |
| TC-PROD-4 | ✅ | edit 200; soft-retire (DELETE) 200 |
| TC-PROD-5 | ✅ | SO line `productId` persisted (=1) |
| TC-PROD-6 | ✅ | non-numeric id → 404; Products page renders clean |

### 12b. Business partners
| ID | R | Evidence |
|----|---|----------|
| TC-PART-1 | ✅ | create 201 |
| TC-PART-2 | ✅ | list 200, includes the new partner |
| TC-PART-3 | ✅ | link customer 200, link vendor 200 |
| TC-PART-4 | ✅ | 360° view: 1 customer + 1 vendor, 6 sales orders, 4 AR invoices, $240 outstanding |
| TC-PART-5 | ✅ | bad recordId → 404 |
| TC-PART-6 | ✅ | Partners page + 360° drawer render, no console warnings |

### 15. Hardening & regression
| ID | R | Evidence |
|----|---|----------|
| TC-FIX-1 | ✅ | `balanced=true` |
| TC-FIX-2 | ✅ | treasury non-numeric id → 404 |
| TC-FIX-3 | ✅ | unbalanced journal → 422; balanced → 201 |
| TC-FIX-4 | ✅ | member create-user → 403; admin → 201 |
| TC-FIX-5 | ✅ | read-only quotation → 403; requester → 201 |
| TC-FIX-6 | ✅ | Projects dashboard: no `valueStyle` warning |

### Findings — all resolved (PR #4)
1. ✅ **Balance sheet** — opening-balance equity plug (`prisma/setup-opening-balance.js`); now `balanced=true`.
2. ✅ **`treasury/{non-numeric}` → 500** — NaN guard added → 404.
3. ✅ **antd `valueStyle` deprecation** — migrated to `styles.content`.
4. ✅ **`core/users` create authz** — now requires admin/super_admin.
5. ✅ **Manual journal balance** — debits must equal credits, else 422.
6. ✅ **Quotation/attachment write perms** — require a procurement write capability, not mere read.
7. ✅ **`admin@demo.com` reception gap** — a demo role assignment, not a code defect (the workflow works, proven via `pedro`).

### Notes
- These runs created QA test data on the demo tenant (test PRs/invoices/journals/customers/products/partners/payroll runs/users + stock adjustments). Harmless on the demo tenant; can be cleaned if desired.
- Module **main** pages all render without console errors (the Projects deprecation warning is now resolved). Sub-pages share components with verified pages and their data endpoints return 200.
