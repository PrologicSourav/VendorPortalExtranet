using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using Microsoft.Extensions.Logging;

namespace WebProlific.Infrastructure.Data;

public class AppDbContext : DbContext
{
    private readonly ILogger<AppDbContext> _logger;

    public AppDbContext(DbContextOptions<AppDbContext> options, ILogger<AppDbContext> logger) : base(options)
    {
        _logger = logger;
    }

    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<VendorDocument> VendorDocuments => Set<VendorDocument>();
    public DbSet<VendorUser> VendorUsers => Set<VendorUser>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<BuyingEntity> BuyingEntities => Set<BuyingEntity>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<Catalogue> Catalogues => Set<Catalogue>();
    public DbSet<CatalogueLine> CatalogueLines => Set<CatalogueLine>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderLine> PurchaseOrderLines => Set<PurchaseOrderLine>();
    public DbSet<DeliveryNote> DeliveryNotes => Set<DeliveryNote>();
    public DbSet<DeliveryNoteLine> DeliveryNoteLines => Set<DeliveryNoteLine>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<KycChangeRequest> KycChangeRequests => Set<KycChangeRequest>();
    public DbSet<VendorDedupCluster> VendorDedupClusters => Set<VendorDedupCluster>();
    public DbSet<VendorDedupCandidate> VendorDedupCandidates => Set<VendorDedupCandidate>();
    public DbSet<ItemDedupCluster> ItemDedupClusters => Set<ItemDedupCluster>();
    public DbSet<ItemDedupCandidate> ItemDedupCandidates => Set<ItemDedupCandidate>();
    public DbSet<RateContract> RateContracts => Set<RateContract>();
    public DbSet<RateContractLine> RateContractLines => Set<RateContractLine>();
    public DbSet<AppUser> Users => Set<AppUser>();

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Saving changes to database. Entities to be saved: {Count}", ChangeTracker.Entries().Count());
        
        // Log entity changes
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || 
                       e.State == EntityState.Modified || 
                       e.State == EntityState.Deleted)
            .ToList();

        foreach (var entry in entries)
        {
            _logger.LogDebug("Entity {EntityType} ({Id}) - State: {State}", 
                entry.Entity.GetType().Name, 
                entry.Entity.GetType().GetProperty("Id")?.GetValue(entry.Entity, null) ?? "N/A",
                entry.State);
        }

        var result = await base.SaveChangesAsync(cancellationToken);
        
        _logger.LogInformation("Saved changes to database. Records affected: {Count}", result);
        return result;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        _logger.LogInformation("Configuring database model");
        
        base.OnModelCreating(modelBuilder);

        // Vendor
        modelBuilder.Entity<Vendor>(e =>
        {
            e.HasIndex(v => v.Gstin).IsUnique().HasFilter("[Gstin] IS NOT NULL");
            _logger.LogDebug("Configured Vendor entity with unique filtered index on Gstin");
        });

        // Catalogue
        modelBuilder.Entity<Catalogue>(e =>
        {
            e.HasOne(c => c.Vendor).WithMany(v => v.Catalogues).HasForeignKey(c => c.VendorId);
            e.HasOne(c => c.BuyingEntity).WithMany().HasForeignKey(c => c.BuyingEntityId);
            _logger.LogDebug("Configured Catalogue entity relationships");
        });

        modelBuilder.Entity<CatalogueLine>(e =>
        {
            e.HasOne(cl => cl.Catalogue).WithMany(c => c.Lines).HasForeignKey(cl => cl.CatalogueId);
            e.HasOne(cl => cl.Item).WithMany(i => i.CatalogueLines).HasForeignKey(cl => cl.ItemId).IsRequired(false);
            _logger.LogDebug("Configured CatalogueLine entity relationships");
        });

        // Purchase Order
        modelBuilder.Entity<PurchaseOrder>(e =>
        {
            e.HasIndex(po => po.PoNumber).IsUnique();
            e.HasOne(po => po.Vendor).WithMany(v => v.PurchaseOrders).HasForeignKey(po => po.VendorId);
            e.HasOne(po => po.BuyingEntity).WithMany(be => be.PurchaseOrders).HasForeignKey(po => po.BuyingEntityId);
            e.HasOne(po => po.Property).WithMany().HasForeignKey(po => po.PropertyId).IsRequired(false);
            _logger.LogDebug("Configured PurchaseOrder entity with unique index on PoNumber and relationships");
        });

        modelBuilder.Entity<PurchaseOrderLine>(e =>
        {
            e.HasOne(pol => pol.PurchaseOrder).WithMany(po => po.Lines).HasForeignKey(pol => pol.PurchaseOrderId);
            e.HasOne(pol => pol.Item).WithMany(i => i.PurchaseOrderLines).HasForeignKey(pol => pol.ItemId).IsRequired(false);
            _logger.LogDebug("Configured PurchaseOrderLine entity relationships");
        });

        // Delivery Note — use Restrict on Vendor FK to avoid multiple cascade paths
        // (DeliveryNotes → PurchaseOrders → Vendors already cascades)
        modelBuilder.Entity<DeliveryNote>(e =>
        {
            e.HasOne(dn => dn.PurchaseOrder).WithMany(po => po.DeliveryNotes).HasForeignKey(dn => dn.PurchaseOrderId);
            e.HasOne(dn => dn.Vendor).WithMany().HasForeignKey(dn => dn.VendorId).OnDelete(DeleteBehavior.Restrict);
            _logger.LogDebug("Configured DeliveryNote entity relationships with Restrict on Vendor FK");
        });

        modelBuilder.Entity<DeliveryNoteLine>(e =>
        {
            e.HasOne(dnl => dnl.DeliveryNote).WithMany(dn => dn.Lines).HasForeignKey(dnl => dnl.DeliveryNoteId);
            _logger.LogDebug("Configured DeliveryNoteLine entity relationship");
        });

        // Invoice — use Restrict on PurchaseOrder FK to avoid multiple cascade paths
        modelBuilder.Entity<Invoice>(e =>
        {
            e.HasOne(inv => inv.Vendor).WithMany(v => v.Invoices).HasForeignKey(inv => inv.VendorId);
            e.HasOne(inv => inv.PurchaseOrder).WithMany(po => po.Invoices).HasForeignKey(inv => inv.PurchaseOrderId).OnDelete(DeleteBehavior.Restrict);
            _logger.LogDebug("Configured Invoice entity relationships with Restrict on PurchaseOrder FK");
        });

        modelBuilder.Entity<InvoiceLine>(e =>
        {
            e.HasOne(il => il.Invoice).WithMany(inv => inv.Lines).HasForeignKey(il => il.InvoiceId);
            _logger.LogDebug("Configured InvoiceLine entity relationship");
        });

        // Payment — use Restrict on Invoice FK to avoid multiple cascade paths
        modelBuilder.Entity<Payment>(e =>
        {
            e.HasOne(p => p.Vendor).WithMany().HasForeignKey(p => p.VendorId);
            e.HasOne(p => p.Invoice).WithMany().HasForeignKey(p => p.InvoiceId).OnDelete(DeleteBehavior.Restrict);
            _logger.LogDebug("Configured Payment entity relationships with Restrict on Invoice FK");
        });

        // KycChangeRequest
        modelBuilder.Entity<KycChangeRequest>(e =>
        {
            e.HasOne(kcr => kcr.Vendor).WithMany().HasForeignKey(kcr => kcr.VendorId);
            _logger.LogDebug("Configured KycChangeRequest entity relationship");
        });

        // Vendor Dedup
        modelBuilder.Entity<VendorDedupCandidate>(e =>
        {
            e.HasOne(vdc => vdc.Cluster).WithMany(c => c.Candidates).HasForeignKey(vdc => vdc.ClusterId);
            e.HasOne(vdc => vdc.Vendor).WithMany().HasForeignKey(vdc => vdc.VendorId);
            _logger.LogDebug("Configured VendorDedupCandidate entity relationships");
        });

        // Item Dedup
        modelBuilder.Entity<ItemDedupCandidate>(e =>
        {
            e.HasOne(idc => idc.Cluster).WithMany(c => c.Candidates).HasForeignKey(idc => idc.ClusterId);
            e.HasOne(idc => idc.Item).WithMany().HasForeignKey(idc => idc.ItemId);
            _logger.LogDebug("Configured ItemDedupCandidate entity relationships");
        });

        // Rate Contract
        modelBuilder.Entity<RateContract>(e =>
        {
            e.HasOne(rc => rc.Vendor).WithMany().HasForeignKey(rc => rc.VendorId);
            e.HasOne(rc => rc.BuyingEntity).WithMany().HasForeignKey(rc => rc.BuyingEntityId);
            _logger.LogDebug("Configured RateContract entity relationships");
        });

        modelBuilder.Entity<RateContractLine>(e =>
        {
            e.HasOne(rcl => rcl.RateContract).WithMany(rc => rc.Lines).HasForeignKey(rcl => rcl.RateContractId);
            e.HasOne(rcl => rcl.Item).WithMany().HasForeignKey(rcl => rcl.ItemId);
            _logger.LogDebug("Configured RateContractLine entity relationships");
        });

        // VendorUser
        modelBuilder.Entity<VendorUser>(e =>
        {
            e.HasOne(vu => vu.Vendor).WithMany(v => v.Users).HasForeignKey(vu => vu.VendorId);
            _logger.LogDebug("Configured VendorUser entity relationship");
        });
        
        _logger.LogInformation("Database model configuration completed");
    }
}
