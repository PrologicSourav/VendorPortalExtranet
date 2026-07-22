using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using WebProlific.Api.Services;
using WebProlific.Api.Middleware;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;
using WebProlific.Infrastructure.Repositories;
using FluentValidation.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ─── Disable config file watching to avoid inotify limits on Render free tier ──
builder.Configuration.Sources.Clear();
builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: false)
    .AddEnvironmentVariables();

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
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

// ─── Controllers & Swagger ──────────────────────────────────
builder.Services.AddControllers()
    .AddFluentValidation(fv => fv.RegisterValidatorsFromAssemblyContaining<Program>());

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Web Prol'IFIC API", Version = "v1" });
});

// ─── CORS ───────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.AllowAnyOrigin()
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

// ─── Swagger (all environments) ─────────────────────────────
app.UseSwagger();
app.UseSwaggerUI();

// ─── Global Exception Middleware ───────────────────────────────────
app.UseMiddleware<GlobalExceptionMiddleware>();

// ─── Apply migrations and update schema ────────
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // Upgrade any plaintext passwords to BCrypt hashes (one-time migration)
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
    logger.LogError(ex, "Database migration failed");
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

app.MapControllers();

app.Run();

