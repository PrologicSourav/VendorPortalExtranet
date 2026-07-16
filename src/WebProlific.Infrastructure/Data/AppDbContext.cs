using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;

namespace WebProlific.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Vendor
        modelBuilder.Entity<Vendor>(e =>
        {
            e.HasIndex(v => v.Gstin).IsUnique();
            e.Property(v => v.LegalName).HasMaxLength(200);
            e.Property(v => v.Gstin).HasMaxLength(15);
            e.Property(v => v.Pan).HasMaxLength(10);
        });

        // Catalogue
        modelBuilder.Entity<Catalogue>(e =>
        {
            e.HasOne(c => c.Vendor).WithMany(v => v.Catalogues).HasForeignKey(c => c.VendorId);
            e.HasOne(c => c.BuyingEntity).WithMany().HasForeignKey(c => c.BuyingEntityId);
        });

        modelBuilder.Entity<CatalogueLine>(e =>
        {
            e.HasOne(cl => cl.Catalogue).WithMany(c => c.Lines).HasForeignKey(cl => cl.CatalogueId);
            e.HasOne(cl => cl.Item).WithMany(i => i.CatalogueLines).HasForeignKey(cl => cl.ItemId).IsRequired(false);
        });

        // Purchase Order
        modelBuilder.Entity<PurchaseOrder>(e =>
        {
            e.HasIndex(po => po.PoNumber).IsUnique();
            e.HasOne(po => po.Vendor).WithMany(v => v.PurchaseOrders).HasForeignKey(po => po.VendorId);
            e.HasOne(po => po.BuyingEntity).WithMany(be => be.PurchaseOrders).HasForeignKey(po => po.BuyingEntityId);
            e.HasOne(po => po.Property).WithMany().HasForeignKey(po => po.PropertyId).IsRequired(false);
        });

        modelBuilder.Entity<PurchaseOrderLine>(e =>
        {
            e.HasOne(pol => pol.PurchaseOrder).WithMany(po => po.Lines).HasForeignKey(pol => pol.PurchaseOrderId);
            e.HasOne(pol => pol.Item).WithMany(i => i.PurchaseOrderLines).HasForeignKey(pol => pol.ItemId).IsRequired(false);
        });

        // Delivery Note — use Restrict on Vendor FK to avoid multiple cascade paths
        // (DeliveryNotes → PurchaseOrders → Vendors already cascades)
        modelBuilder.Entity<DeliveryNote>(e =>
        {
            e.HasOne(dn => dn.PurchaseOrder).WithMany(po => po.DeliveryNotes).HasForeignKey(dn => dn.PurchaseOrderId);
            e.HasOne(dn => dn.Vendor).WithMany().HasForeignKey(dn => dn.VendorId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DeliveryNoteLine>(e =>
        {
            e.HasOne(dnl => dnl.DeliveryNote).WithMany(dn => dn.Lines).HasForeignKey(dnl => dnl.DeliveryNoteId);
        });

        // Invoice — use Restrict on PurchaseOrder FK to avoid multiple cascade paths
        modelBuilder.Entity<Invoice>(e =>
        {
            e.HasOne(inv => inv.Vendor).WithMany(v => v.Invoices).HasForeignKey(inv => inv.VendorId);
            e.HasOne(inv => inv.PurchaseOrder).WithMany(po => po.Invoices).HasForeignKey(inv => inv.PurchaseOrderId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<InvoiceLine>(e =>
        {
            e.HasOne(il => il.Invoice).WithMany(inv => inv.Lines).HasForeignKey(il => il.InvoiceId);
        });

        // Payment — use Restrict on Invoice FK to avoid multiple cascade paths
        modelBuilder.Entity<Payment>(e =>
        {
            e.HasOne(p => p.Vendor).WithMany().HasForeignKey(p => p.VendorId);
            e.HasOne(p => p.Invoice).WithMany().HasForeignKey(p => p.InvoiceId).OnDelete(DeleteBehavior.Restrict);
        });

        // KycChangeRequest
        modelBuilder.Entity<KycChangeRequest>(e =>
        {
            e.HasOne(kcr => kcr.Vendor).WithMany().HasForeignKey(kcr => kcr.VendorId);
        });

        // Vendor Dedup
        modelBuilder.Entity<VendorDedupCandidate>(e =>
        {
            e.HasOne(vdc => vdc.Cluster).WithMany(c => c.Candidates).HasForeignKey(vdc => vdc.ClusterId);
            e.HasOne(vdc => vdc.Vendor).WithMany().HasForeignKey(vdc => vdc.VendorId);
        });

        // Item Dedup
        modelBuilder.Entity<ItemDedupCandidate>(e =>
        {
            e.HasOne(idc => idc.Cluster).WithMany(c => c.Candidates).HasForeignKey(idc => idc.ClusterId);
            e.HasOne(idc => idc.Item).WithMany().HasForeignKey(idc => idc.ItemId);
        });

        // Rate Contract
        modelBuilder.Entity<RateContract>(e =>
        {
            e.HasOne(rc => rc.Vendor).WithMany().HasForeignKey(rc => rc.VendorId);
            e.HasOne(rc => rc.BuyingEntity).WithMany().HasForeignKey(rc => rc.BuyingEntityId);
        });

        modelBuilder.Entity<RateContractLine>(e =>
        {
            e.HasOne(rcl => rcl.RateContract).WithMany(rc => rc.Lines).HasForeignKey(rcl => rcl.RateContractId);
            e.HasOne(rcl => rcl.Item).WithMany().HasForeignKey(rcl => rcl.ItemId);
        });

        // VendorUser
        modelBuilder.Entity<VendorUser>(e =>
        {
            e.HasOne(vu => vu.Vendor).WithMany(v => v.Users).HasForeignKey(vu => vu.VendorId);
        });
    }
}
