# Real-browser verification

`employee-codes-userlink.cjs` covers employee Add/Edit without Department, immutable generated codes, inline designation and state preservation, employee search/autofill, account roles/branches, duplicate options and profile account details. Run it once against a fresh disposable fixture before the other suites.

`hrms-simplified.cjs` exercises real Django endpoints, seven HRMS sidebar items, merged tabs/refresh, legacy routes, access administration, designation CRUD, custom-role checkboxes, employee profiles, payroll calculate/review/approve/pay, employee restrictions and mobile overflow. `hrms-documents.cjs` covers document upload/download/replacement/deletion inside a profile and activity history. `hrms-rbac.cjs` is a compatibility entry point for the simplified suite. `modernization.cjs` preserves the prior ERP browser regression suite and its existing demo prerequisites.

Install Playwright as a test-only dependency/tool in your local test environment; the application has no added runtime dependency on Playwright. Set E2E_PASSWORD to a temporary test password and CHROMIUM_PATH if using a custom executable. Otherwise Playwright uses its installed Chromium.

Prepare a disposable database from backend (never your business database):

```bash
export DJANGO_SETTINGS_MODULE=config.settings.test
export SQLITE_TEST_DATABASE=/tmp/perfumosol_hrms_browser.sqlite3
export E2E_PASSWORD='choose-a-strong-temporary-test-password'
python manage.py migrate --noinput
python tests/prepare_hrms_browser.py
CORS_ALLOWED_ORIGINS=http://localhost:5177,http://127.0.0.1:5177 python manage.py runserver 127.0.0.1:8000 --noreload
```

Start frontend in a second terminal:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1 yarn dev --host 127.0.0.1 --port 5177 --strictPort
```

Run the browser suite in a third terminal with the same E2E_PASSWORD:

```bash
FRONTEND_URL=http://127.0.0.1:5177 node tests/employee-codes-userlink.cjs
FRONTEND_URL=http://127.0.0.1:5177 node tests/hrms-simplified.cjs
FRONTEND_URL=http://127.0.0.1:5177 node tests/hrms-documents.cjs
```

Use a fresh scratch database for each run because the suite posts a locked payroll. SCREENSHOT_DIR optionally saves visual evidence. Browser usernames are isolated fixture accounts hrms_browser and hrms_employee; no fixed login password is shipped. Delete only that disposable test database when finished.
