## Purchase/POS/location-stock regression

Backend suite passed (61 tests before the additional piece/inactive-location case); opening stock tests also ran separately after decimal validation changes. Frontend build/lint passed. Live browser checks include branch create with warehouse, raw material create with quantities at two locations, purchase select and save, and computed POS button colors without hover. Existing 33-route, wizard, manufacturing and mobile regression is retained.

## White and violet theme revision

Inventory links are now individual siblings. Theme follows the supplied reference: white sidebar, vivid violet accents, pale workspace and rounded cards. Build and lint passed. Updated browser screenshots are included.

# Validation record

Tests were performed against the local Django backend from the automatic-product release, with a disposable SQLite demonstration database. The user's deployed Windows/WSL environment was not modified.

## Passed

- Yarn Classic frozen-lockfile install, lint (zero errors), production build.
- All 16 API clients match the uploaded frontend source exactly.
- 33 main operational routes render with live API data and no application-level horizontal overflow.
- No JavaScript page exceptions or backend 5xx responses during the browser regression pass.
- Login/logout, collapsed sidebar persistence, individual active navigation, navigation search and mobile drawer.
- Category create/edit/delete with redesigned dialogs/table.
- Six-step product wizard, 100-bottle packaging requirements, liquid/cost calculations, saving and persisted planned quantity.
- Source stock lookup and actual manufacture of two units; finished-stock display afterward.
- Mobile 390×844 dashboard, raw-material list, POS, reports and product workspace.
- Zoom-equivalent CSS viewport widths for 80/90/100/110/125/150 percent. Native browser zoom itself was not automated.
- Dialog focus containment and Escape cancellation.

## Remaining recommendations and coverage limits

Oxlint reports non-failing React effect/dependency/state synchronization recommendations. Existing transactions were kept intact rather than rewriting their effects solely to silence the compiler recommendations. There are no lint errors or unused-import warnings.

Purchase/finance/POS/transfer/return pages and major dialogs are retained and restyled; every transaction mutation path was not individually submitted during this browser pass. No backend schema or rule changed. Production deployment, cross-browser testing and full accessibility certification were not performed.

The light theme is complete; no dark-mode toggle is exposed. Native select controls remain for reliable keyboard behavior, with filtering offered on long choice lists. Browser Back/Forward within the SPA does not trigger the unsaved-link guard.
