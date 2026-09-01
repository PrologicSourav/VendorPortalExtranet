using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using WebProlific.Api.Services;
using WebProlific.Api.Middleware;
using WebProlific.Api.Extensions;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;
using WebProlific.Infrastructure.Repositories;
using FluentValidation.AspNetCore;
using Serilog;

// Config file watching (inotify) is disabled via the DOTNET_hostBuilder__reloadConfigOnChange=false
// env var (set in render.yaml/Dockerfile) to avoid exhausting Render's free-tier inotify limit —
// must be an env var, not code here, since CreateBuilder() below adds its default appsettings.json
// source (reloadOnChange defaults to true) before any code in this file can run.
var builder = WebApplication.CreateBuilder(args);

// ─── Database ───────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured. Set it via the ConnectionStrings__DefaultConnection environment variable.");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// ─── Services ───────────────────────────────────────────────
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<ICurrencyConversionService, CurrencyConversionService>();
builder.Services.AddHttpClient(); // For external exchange rate API
builder.Services.AddScoped<ITokenService, TokenService>();

// ─── Repositories ───────────────────────────────────────────
builder.Services.AddScoped<IVendorRepository, VendorRepository>();
builder.Services.AddScoped<ICatalogueRepository, CatalogueRepository>();
builder.Services.AddScoped<IPurchaseOrderRepository, PurchaseOrderRepository>();
builder.Services.AddScoped<IDeliveryNoteRepository, DeliveryNoteRepository>();
builder.Services.AddScoped<IInvoiceRepository, InvoiceRepository>();
builder.Services.AddScoped<IKycRepository, KycRepository>();
builder.Services.AddScoped<IMakerCheckerRepository, MakerCheckerRepository>();
builder.Services.AddScoped<IItemRepository, ItemRepository>();
builder.Services.AddScoped<IDedupRepository, DedupRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
builder.Services.AddScoped<IRateContractRepository, RateContractRepository>();
builder.Services.AddScoped<IVendorRelationshipRepository, VendorRelationshipRepository>();
builder.Services.AddScoped<IVendorRequestRepository, VendorRequestRepository>();
builder.Services.AddScoped<IVendorUserAccessRepository, VendorUserAccessRepository>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();

// ─── Web Prol'IFIC (WISH) PO sync ────────────────────────────
// Read-only integration: pulls printed/open POs from WISH's own database into this
// system's own tables. ConnectionStrings:WishConnection is optional — if unset (no
// network path to WISH's DB, e.g. most cloud deployments), the reader/background
// service both no-op instead of failing startup.
builder.Services.AddScoped<WebProlific.Infrastructure.WishIntegration.WishPurchaseOrderReader>();
builder.Services.AddScoped<WebProlific.Infrastructure.WishIntegration.WishPoSyncService>();
builder.Services.AddScoped<WebProlific.Infrastructure.WishIntegration.WishBuyingEntityReader>();
builder.Services.AddScoped<WebProlific.Infrastructure.WishIntegration.WishBuyingEntitySyncService>();
builder.Services.AddScoped<WebProlific.Infrastructure.WishIntegration.WishUserValidator>();
builder.Services.AddHostedService<WishSyncBackgroundService>();

// ─── JWT Auth ───────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException("Jwt:Key is not configured. Set it via the Jwt__Key environment variable.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "WebProlific",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "WebProlific",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
// Testing escape hatch: when Dedup:AllowAnonymous is true the InternalOnly policy
// lets unauthenticated callers through so the dedup screens can be exercised
// without wiring up a token. Defaults to false — leave it off in production.
var allowAnonymousDedup = builder.Configuration.GetValue<bool>("Dedup:AllowAnonymous");
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
    options.AddPolicy("InternalOnly", policy =>
        policy.RequireAssertion(ctx => allowAnonymousDedup || ctx.User.IsInternal()));
});

// ─── Controllers & Swagger ──────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Entities are serialized directly (no DTO layer) and EF's navigation-fixup
        // wires child.Parent back to the same tracked instance, e.g.
        // Catalogue.Lines[].Catalogue.Lines[]... — ignore the cycle instead of 500ing.
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        // Default System.Text.Json behavior serializes enums as their numeric value
        // (e.g. CatalogueStatus.Draft -> 0). Every frontend screen/mock was built
        // assuming string status values ("Draft", "New", ...) — without this, status
        // comparisons and "catalogue.status" + status translation-key lookups silently
        // break against real data (never caught because nothing exercised real
        // enum-bearing rows against the frontend until now).
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    })
    .AddFluentValidation(fv => fv.RegisterValidatorsFromAssemblyContaining<Program>());

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Web Prol'IFIC API", Version = "v1" });
});

// ─── CORS ───────────────────────────────────────────────────
var allowedOrigins = (builder.Configuration["AllowedOrigins"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ─── Logging Configuration ────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithProperty("Application", "WebProlific.Api")
    .CreateLogger();

builder.Host.UseSerilog();

var app = builder.Build();

// ─── Swagger (Development only) ──────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ─── Global Exception Middleware ───────────────────────────────────
app.UseMiddleware<GlobalExceptionMiddleware>();

// ─── Apply migrations ───────────────────────────────────────
// Fail fast: starting up against an out-of-date/broken schema is worse
// than not starting at all.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// ─── Upgrade any plaintext passwords to BCrypt hashes (one-time cleanup) ───
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var plaintextUsers = db.Users.Where(u =>
        u.PasswordHash != null && !u.PasswordHash.StartsWith("$2")).ToList();
    foreach (var u in plaintextUsers)
    {
        u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(u.PasswordHash);
    }
    if (plaintextUsers.Count > 0)
    {
        await db.SaveChangesAsync();
        var log = app.Services.GetRequiredService<ILogger<Program>>();
        log.LogInformation("Upgraded {Count} plaintext passwords to BCrypt hashes", plaintextUsers.Count);
    }
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "Plaintext password upgrade failed");
}

// ─── Backfill VendorRelationships from existing PO history (one-time, idempotent) ───
// The vendor-relationship access model is new; no vendor has one yet. Rather than
// leave every existing vendor locked out of properties they already legitimately
// transact with, infer an Active Property-scoped relationship from their own
// PurchaseOrders (PropertyId already set on those rows). Safe to re-run: the
// filtered unique index means a duplicate insert attempt for an existing active
// pairing is simply skipped here before it would ever hit that constraint.
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var existingPairs = db.VendorRelationships
        .Where(r => r.PropertyId != null)
        .Select(r => new { r.VendorId, PropertyId = r.PropertyId!.Value })
        .ToHashSet();

    var poPairs = db.PurchaseOrders
        .Where(po => po.PropertyId != null)
        .Select(po => new { po.VendorId, PropertyId = po.PropertyId!.Value, po.BuyingEntityId })
        .Distinct()
        .ToList();

    var toCreate = poPairs
        .Where(p => !existingPairs.Contains(new { p.VendorId, p.PropertyId }))
        .Select(p => new VendorRelationship
        {
            Id = Guid.NewGuid(),
            VendorId = p.VendorId,
            BuyingEntityId = p.BuyingEntityId,
            PropertyId = p.PropertyId,
            ScopeType = VendorRelationshipScope.Property,
            Status = VendorRelationshipStatus.Active,
            StartDate = DateTime.UtcNow,
        })
        .ToList();

    if (toCreate.Count > 0)
    {
        db.VendorRelationships.AddRange(toCreate);
        await db.SaveChangesAsync();
        var log = app.Services.GetRequiredService<ILogger<Program>>();
        log.LogInformation("Backfilled {Count} VendorRelationship row(s) from existing PO history", toCreate.Count);
    }
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "VendorRelationship backfill failed");
}

// ─── Deactivate duplicate WISH-synced Properties (one-time cleanup) ───
// An earlier version of WishBuyingEntitySyncService didn't record a
// newly-created Property back into its own lookup before the next row, so a
// WishPropertyId that WISH's vo_property table itself repeats (it does) got a
// second Property row created every time instead of being matched/updated.
// Deactivating rather than deleting: nothing needs a hard-delete here, and a
// duplicate a VendorRelationship/PurchaseOrder already points at must keep
// resolving correctly rather than break a foreign key.
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var wishSynced = await db.Properties
        .Where(p => p.WishPropertyId != null && p.IsActive)
        .ToListAsync();

    var duplicateGroups = wishSynced
        .GroupBy(p => p.WishPropertyId!)
        .Where(g => g.Count() > 1)
        .ToList();

    // Two bulk queries up front instead of one round-trip per duplicate group —
    // this ran against a remote, occasionally-slow WISH SQL Server, and a
    // per-group query (hundreds of them, sequential) risked the container's
    // startup never finishing in time.
    var referencedPropertyIds = (await db.VendorRelationships
        .Where(r => r.PropertyId != null)
        .Select(r => r.PropertyId!.Value)
        .Distinct()
        .ToListAsync())
        .Concat(await db.PurchaseOrders
            .Where(po => po.PropertyId != null)
            .Select(po => po.PropertyId!.Value)
            .Distinct()
            .ToListAsync())
        .ToHashSet();

    var deactivated = 0;
    foreach (var group in duplicateGroups)
    {
        // Keep the row anything already references, if one is referenced;
        // otherwise keep the earliest-created row and deactivate the rest.
        var keep = group.FirstOrDefault(p => referencedPropertyIds.Contains(p.Id)) ?? group.First();
        foreach (var dup in group.Where(p => p.Id != keep.Id))
        {
            dup.IsActive = false;
            deactivated++;
        }
    }

    if (deactivated > 0)
    {
        await db.SaveChangesAsync();
        var log = app.Services.GetRequiredService<ILogger<Program>>();
        log.LogInformation("Deactivated {Count} duplicate WISH-synced Property row(s)", deactivated);
    }
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "Duplicate Property cleanup failed");
}

// ─── Middleware ──────────────────────────────────────────────
app.UseHttpsRedirection();
app.UseCors("AllowAngular");
app.UseSerilogRequestLogging();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseAuthentication();
app.UseAuthorization();

// ─── Localization Middleware ──────────────────────────────
app.UseMiddleware<LocalizationMiddleware>();

// ─── Governance property-scope context ─────────────────────
app.UseMiddleware<GovernancePropertyMiddleware>();

app.MapControllers();

app.Run();

