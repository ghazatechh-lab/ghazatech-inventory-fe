## Purchase, POS and location stock update

- Categories moved to Administration; its route and permissions remain intact.
- Purchase creation/editing select actual material masters. Selection fills unit and rate, and submitted quantities use the backend qty field.
- POS actions use violet backgrounds with white text and icons without hover.
- Material creation includes an opening quantity for each active accessible warehouse/branch. Each positive quantity posts an OPENING_STOCK movement atomically. Existing materials use Stock Adjustments.
- Branch creation/editing selects an active warehouse. The branch list and details show its name. Existing branches remain unassigned until edited.
- Requires backend migration 0012_location_warehouse from this release. Stock remains separate for a branch and its warehouse; linking them does not duplicate balances.

## Violet workspace update

White sidebar, violet active navigation, pale workspace, rounded cards and consistent forms inspired by the supplied reference. Raw Materials, Fragrances, Formulations and Products are individual Inventory links; Categories is in Administration. Business relationships and API calls are preserved.

# PerfumASol — Modern frontend

Complete frontend source for the existing Django ERP. The release uses the uploaded frontend.zip as its baseline. It preserves the automatic bottle/pump/cap calculation workflow and all 16 API client files byte for byte. No backend files or database changes are included.

## Run

Use Node 22 or newer. This project pins Yarn Classic 1.22.22 through packageManager to match its yarn.lock.

```bash
corepack enable
corepack yarn install --frozen-lockfile
corepack yarn lint
corepack yarn build
corepack yarn start
```

If Yarn Classic is already installed, the usual `yarn install`, `yarn lint`, `yarn build`, and `yarn start` commands work. Existing frontend environment configuration is preserved; use .env.example when setting up a new installation. The default API is http://localhost:8000/api/v1.

## Update your WSL project

Extract the ZIP so the new frontend directory is `/mnt/c/Users/hashi/Downloads/frontend`. Stop the existing frontend with Ctrl+C, then run:

```bash
src=/mnt/c/Users/hashi/Downloads/frontend
dest=/mnt/d/Myworks/Aroma/Inventory/perfumosol/frontend
if [ -f "$src/package.json" ] && [ -f "$src/src/App.jsx" ]; then
  rsync -avh --exclude='.env' --exclude='.env.*' --exclude='.git/' \
    --exclude='node_modules/' --exclude='dist/' --exclude='test-artifacts/' \
    "$src/" "$dest/" &&
  cd "$dest" &&
  npx --yes yarn@1.22.22 install --frozen-lockfile &&
  npx --yes yarn@1.22.22 build &&
  npx --yes yarn@1.22.22 start
else
  echo "Source not found. Extract the ZIP and check Downloads/frontend."
fi
```

These commands merge the frontend only, preserve Git and environment files, and do not delete existing files or change the backend. The backend must already support the latest automatic product creation release (pump/cap defaults and planned quantity).

## What changed

- Centralized violet, white and pale-neutral tokens; a light theme throughout. Professional typography, consistent form heights, compact cards and neutral table headers. Dark mode is intentionally not offered.
- Rebuilt responsive app shell, independently scrolling sidebar, desktop collapse with saved preference, mobile drawer, individual inventory navigation and active-route group expansion.
- Categories are in Administration. Raw Materials, Fragrances, Formulations and Products are separate links within Inventory. Bottle Setup and stock screens remain within Inventory. Branches, Warehouses and Profile are grouped under Administration. Existing permissions determine visible destinations.
- Topbar page context, account dropdown and permission-aware page search (Ctrl/Cmd+K, arrows, Enter, Escape). Existing assigned branch/warehouse context is displayed when present; no unsupported branch switcher or notification system is added.
- Operational dashboard rebuilt around real backend metrics, accessible KPI buttons, chart/alert empty states, retry state and muted chart styling.
- Login redesigned with password visibility, proper labels and autocomplete; password reset retained and restyled.
- Shared DataTable rebuilt with search, optional sorting, sticky headers, local scrolling, stable pagination after dataset changes, row IDs, numeric alignment, clear loading/empty/error states and named controls.
- Shared form inputs rebuilt with associated labels, stable IDs, error announcements and keyboard-friendly native selects. Large select lists offer a filter field while retaining the current selection.
- Dialog styling and behavior standardized: initial focus, focus containment, Escape through existing cancel/close actions, scroll locking and focus restoration. Destructive confirmation behavior remains in ConfirmModal.
- Six-step product creation: Product → Formulation → Variants → Automatic packaging → Cost & pricing → Review & save. Previous/Next controls retain values, validate visible fields, and protect unsaved edits on navigation-link clicks and reload/close. Stock is still created only by manufacture.
- Manufacturing shows source warehouse material availability, insufficient-stock warnings and loading/error status. Availability is fetched using the existing raw-material API and location filter. The backend remains authoritative when confirming production.
- POS adapts to stacked mobile layouts without a fixed viewport clipping the cart. Existing checkout calculations and transactions remain intact.
- Shared surfaces, typography, tables, accents and controls applied across every existing operational page and detail modal.
- Route-level loading: initial entry JavaScript is approximately 276 KB, down from the previous single bundle of approximately 1.29 MB. Largest production chunk is approximately 353 KB; production build has no large-chunk warning.

## Pages covered

| Module | Screens and dialogs |
| --- | --- |
| Authentication | Login, password reset |
| Dashboard | Operational dashboard |
| Inventory | Categories, raw materials, material details, stock overview, adjustments and adjustment modal, movements, low stock, wastage |
| Fragrance and formulation | Fragrance master/details/editor, percentage formulation list/editor and recipe validation |
| Bottle Setup | Bottle sizes and concentrations, both editors and details |
| Products | Product catalogue, six-step creation/edit, unified details: overview, variants, recipe, packaging, costing/pricing, manufacture, stock, history |
| Purchases | Suppliers/details, purchase orders/create/details, GRN/create/details, bills/create/details/payment controls, purchase returns/details |
| Sales | Customer list/details/editor, invoices/details/return controls, POS/customer/payment/receipt dialogs |
| Accounting | Accounts dashboard, cash & bank, income, expenses, receivables, payables and their transaction/detail controls |
| Transfers | Transfer list, creation, details and dispatch/receipt controls |
| Reports | Sales, inventory, production, profitability and profit/loss views; existing filters and charts |
| Administration | Branches/details/editor, warehouses/details/editor, profile and existing account actions |

Legacy product/production components remain available in the source and receive the same styling. Their legacy route redirects remain; they are not restored as standalone sidebar workflows.

## Shared implementation

- `src/styles/design-system.css` and `src/index.css`: centralized visual tokens, layout and semantic component styles, responsive breakpoints, print and reduced-motion support.
- `src/components/layout/`: navigation model, sidebar, topbar and shell.
- `src/components/common/`: PageHeader, DataTable, StatCard, LoadingSkeleton, ErrorState, confirmations and create dialogs.
- `src/components/forms/FormControls.jsx`: labelled controls and choice filtering.
- `src/hooks/`: dialog keyboard/focus behavior and unsaved-edit guards.
- `src/App.jsx`: lazy loading without changing route destinations or API integration.

## Validation

- Yarn 1.22.22 install with frozen lockfile: passed.
- Yarn lint: passed with zero errors. Remaining warnings primarily concern effect dependencies and state synchronization in existing modules; see docs/VALIDATION.md.
- Yarn production build: passed.
- Compared all 16 API client files with the uploaded source: unchanged.
- Browser checks with a local Django backend and disposable seeded data: 33 operational routes; login/logout; sidebar collapse/reload persistence; Ctrl+K search; category create/edit/delete; full product wizard and saved quantity; actual confirmed manufacture and finished-stock display; dialog focus/Escape; mobile drawer; desktop/mobile layout checks.
- Product test: 100 planned perfumes produced 100 required bottles, pumps and caps and the corresponding liquid/cost preview. Manufacturing 2 bottles posted real stock through the existing backend.
- Responsive tests include 390×844 mobile and CSS viewport sizes corresponding to 80%, 90%, 100%, 110%, 125%, 150% zoom on a 1440×1000 desktop. These are zoom-equivalent viewport tests, not native browser zoom controls.
- Screenshots from those checks are included in docs/screenshots.

## Practical limits

The browser pass covers every main operational route and representative live writes. It does not individually submit every purchase, finance, POS, transfer and return transaction, or certify WCAG compliance. All of their existing API clients and business request contracts are retained. Test those actions with your own role assignments and data before production rollout.

The unsaved-edit guard covers navigation links and document unload; SPA browser Back/Forward navigation is not intercepted. Charts and metrics use backend data, so empty charts remain empty until transactions exist.

The optional Playwright regression script is `tests/modernization.cjs`. It requires a Playwright/Chromium development environment and a disposable backend seeded with `seed_perfumosol_demo`; supply E2E_USERNAME, E2E_PASSWORD, FRONTEND_URL and optionally CHROMIUM_PATH/SCREENSHOT_DIR. It creates a product and posts two manufactured units, so use a test database. No test credentials are embedded in the delivered source.
