using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;
using WebProlific.Infrastructure.Repositories;
using FluentValidation.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// ─── Database ───────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

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
var jwtKey = builder.Configuration["Jwt:Key"] ?? "DevSecretKey_ChangeInProduction_32Chars!";
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
builder.Services.AddAuthorization();

// ─── Controllers & Swagger ──────────────────────────────────
builder.Services.AddControllers()
    .AddFluentValidation(fv => fv.RegisterValidatorsFromAssemblyContaining<Program>());

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Web Prol'IFIC API", Version = "v1" });
});

// ─── CORS ───────────────────────────────────────────────────
var allowedOrigins = (builder.Configuration["AllowedOrigins"] ?? "http://localhost:4200,http://localhost:4201")
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

var app = builder.Build();

// ─── Middleware ──────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ─── Auto-create database & seed (all environments) ─────────
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    // Seed data if Users table is empty
    if (!db.Users.Any())
    {
        db.Users.AddRange(
            new WebProlific.Core.Entities.AppUser
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
                Email = "admin@webprolific.com",
                DisplayName = "System Admin",
                PasswordHash = "admin123",
                Role = WebProlific.Core.Entities.UserRole.InternalAdmin,
                IsInternal = true,
                IsActive = true
            },
            new WebProlific.Core.Entities.AppUser
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000002"),
                Email = "buyer@webprolific.com",
                DisplayName = "Procurement Buyer",
                PasswordHash = "buyer123",
                Role = WebProlific.Core.Entities.UserRole.InternalProcurement,
                IsInternal = true,
                IsActive = true
            },
            new WebProlific.Core.Entities.AppUser
            {
                Id = Guid.Parse("00000000-0000-0000-0000-000000000003"),
                Email = "vendor@mumbaifresh.com",
                DisplayName = "Rajesh Kumar",
                PasswordHash = "vendor123",
                Role = WebProlific.Core.Entities.UserRole.SupplierAdmin,
                VendorId = Guid.Parse("AA000000-0000-0000-0000-000000000001"),
                IsInternal = false,
                IsActive = true
            }
        );
        db.SaveChanges();

        // Seed notifications
        db.Notifications.AddRange(
            new WebProlific.Core.Entities.Notification
            {
                Id = Guid.Parse("CD000000-0000-0000-0000-000000000001"),
                UserId = Guid.Parse("00000000-0000-0000-0000-000000000003"),
                Type = WebProlific.Core.Entities.NotificationType.NewPo,
                Title = "New Purchase Order",
                Detail = "PO-20250701-001 from Sofitel Delhi — ₹84,000",
                IsRead = false,
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            },
            new WebProlific.Core.Entities.Notification
            {
                Id = Guid.Parse("CD000000-0000-0000-0000-000000000002"),
                UserId = Guid.Parse("00000000-0000-0000-0000-000000000003"),
                Type = WebProlific.Core.Entities.NotificationType.PaymentReleased,
                Title = "Payment Released",
                Detail = "Payment of ₹49,500 for PO-20250702-002 is scheduled",
                IsRead = false,
                CreatedAt = DateTime.UtcNow.AddHours(-3)
            },
            new WebProlific.Core.Entities.Notification
            {
                Id = Guid.Parse("CD000000-0000-0000-0000-000000000003"),
                UserId = Guid.Parse("00000000-0000-0000-0000-000000000003"),
                Type = WebProlific.Core.Entities.NotificationType.DocumentRejected,
                Title = "Invoice Rejected",
                Detail = "Invoice INV-003 rejected: unit price exceeds PO by ₹15/kg",
                IsRead = true,
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new WebProlific.Core.Entities.Notification
            {
                Id = Guid.Parse("CD000000-0000-0000-0000-000000000004"),
                UserId = Guid.Parse("00000000-0000-0000-0000-000000000003"),
                Type = WebProlific.Core.Entities.NotificationType.CatalogueDecision,
                Title = "Catalogue Approved",
                Detail = "Your catalogue v1 for Accor — North India has been approved",
                IsRead = true,
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            }
        );
        db.SaveChanges();
    }
}
catch (Exception ex)
{
    // Log but don't crash — database may not be available yet
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "Database initialization failed: {Message}", ex.Message);
}

app.UseHttpsRedirection();
app.UseCors("AllowAngular");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
