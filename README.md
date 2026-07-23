# VendorPortalExtranet
VendorPortalExtranet

## Recent changes (23 Jul 2026)

A dashboard feature and Excel bulk-upload landed for `supplier-portal`. See [`docs/SKILL.md` §13.2](docs/SKILL.md#132-engineering-notes--23-jul-2026-feature-pass) for full details. In short:
- Dashboard now shows a "Catalogues Pending Approval" KPI card (vendor-scoped, 30s auto-refresh), and a layout bug that forced a page scroll at exactly 1024px width is fixed.
- Catalogue Manager supports bulk upload via `.xlsx` (drag-drop, validation, preview, downloadable template) using `exceljs` — chosen over `xlsx`/SheetJS due to unpatched HIGH-severity CVEs in the latter. This is also the first component in the repo covered by real unit tests, which required adding Karma test infra (didn't exist before).

### Previous changes (22 Jul 2026)

A security/code-quality hardening pass and a full multilingual implementation landed. See [`docs/SKILL.md` §13.1](docs/SKILL.md#131-engineering-notes--22-jul-2026-hardening-pass) for the complete list of what changed and what's still open (notably: real OTP/MFA, the empty DTO layer, and a SQL Server pagination compatibility bug). In short:
- API auth was effectively absent (only one endpoint required a token) — now every endpoint requires authentication by default, with per-resource ownership checks (IDOR fixed) and internal-only gating on governance actions.
- Hardcoded secrets (JWT key, DB connection string) removed from source; the API now fails fast at startup if they're unset instead of using a working fallback.
- `supplier-portal` had a structural bug causing duplicate topbars on every screen, no working language persistence, and translation coverage limited to the login screen. All fixed — full RTL support and all 7 screens translated across English, Arabic, Vietnamese, and Thai.

## Development guide

Before implementing any Phase B feature (Supplier Portal, KYC validation, item/vendor de-duplication), read [`docs/SKILL.md`](docs/SKILL.md) — it's the single source of truth for architecture, data models, API contracts, security requirements, and Angular component conventions for this project. [`docs/SKILL_QUICK_REFERENCE.md`](docs/SKILL_QUICK_REFERENCE.md) is a navigation aid for finding the right section quickly.

## Local development secrets

`Jwt:Key` and `ConnectionStrings:DefaultConnection` are no longer hardcoded in `appsettings.json` — the API throws at startup if either is missing. Set them locally with `dotnet user-secrets` (from `src/WebProlific.Api`) instead of editing `appsettings.Development.json`:

```
dotnet user-secrets set "Jwt:Key" "<any-random-32+-char-string-for-local-dev>"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=.;Database=WebProlific;Trusted_Connection=True;TrustServerCertificate=True"
```

In production (Render), these are set as secret environment variables (`Jwt__Key`, `ConnectionStrings__DefaultConnection`) — never commit real values to `appsettings.json` or `render.yaml`.
