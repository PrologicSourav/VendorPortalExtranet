# VendorPortalExtranet
VendorPortalExtranet

## Local development secrets

`Jwt:Key` and `ConnectionStrings:DefaultConnection` are no longer hardcoded in `appsettings.json` — the API throws at startup if either is missing. Set them locally with `dotnet user-secrets` (from `src/WebProlific.Api`) instead of editing `appsettings.Development.json`:

```
dotnet user-secrets set "Jwt:Key" "<any-random-32+-char-string-for-local-dev>"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=.;Database=WebProlific;Trusted_Connection=True;TrustServerCertificate=True"
```

In production (Render), these are set as secret environment variables (`Jwt__Key`, `ConnectionStrings__DefaultConnection`) — never commit real values to `appsettings.json` or `render.yaml`.
