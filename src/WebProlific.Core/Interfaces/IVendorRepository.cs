using WebProlific.Core.Entities;

namespace WebProlific.Core.Interfaces;

public interface IVendorRepository
{
    Task<Vendor?> GetByIdAsync(Guid id);
    Task<Vendor?> GetByGstinAsync(string gstin);
    Task<IEnumerable<Vendor>> GetAllAsync(string? status, string? search, int page, int pageSize);
    Task<int> GetCountAsync(string? status, string? search);
    Task<Vendor> CreateAsync(Vendor vendor);
    Task<Vendor> UpdateAsync(Vendor vendor);
    Task<bool> ExistsByGstinAsync(string gstin, Guid? excludeId = null);
}

public interface ICatalogueRepository
{
    Task<Catalogue?> GetByIdAsync(Guid id);
    Task<IEnumerable<Catalogue>> GetByVendorAsync(Guid vendorId, string? status);
    /// <summary>All vendors' catalogues at a given status (or every status when null),
    /// including the owning vendor and lines. Used by the governance review queue.</summary>
    Task<IEnumerable<Catalogue>> GetByStatusAsync(string? status);
    Task<Catalogue> CreateAsync(Catalogue catalogue);
    Task<Catalogue> UpdateAsync(Catalogue catalogue);
    Task<IEnumerable<CatalogueLine>> AddLinesAsync(Guid catalogueId, IEnumerable<CatalogueLine> lines);
    /// <summary>Removes a line from a catalogue. Returns false if the line isn't found on it.</summary>
    Task<bool> DeleteLineAsync(Guid catalogueId, Guid lineId);
    /// <summary>First active buying entity in the system, used to default new catalogues
    /// when the caller doesn't specify one (no real entity-picker UI exists yet — VP-02).</summary>
    Task<Guid?> GetDefaultBuyingEntityIdAsync();
}

public interface IPurchaseOrderRepository
{
    Task<PurchaseOrder?> GetByIdAsync(Guid id);
    Task<PurchaseOrder?> GetByPoNumberAsync(string poNumber);
    Task<IEnumerable<PurchaseOrder>> GetByVendorAsync(Guid vendorId, string? status, Guid? propertyId, int page, int pageSize);
    Task<int> GetVendorPoCountAsync(Guid vendorId, string? status, Guid? propertyId);
    /// <summary>Cross-vendor PO search (by PO number or vendor name) for internal
    /// staff — used by the governance console's document-upload lookup.</summary>
    Task<IEnumerable<PurchaseOrder>> SearchAsync(string? search, int page, int pageSize);
    Task<int> SearchCountAsync(string? search);
    Task<PurchaseOrder> CreateAsync(PurchaseOrder po);
    Task<PurchaseOrder> UpdateAsync(PurchaseOrder po);
    /// <summary>Distinct properties this vendor has at least one purchase order for —
    /// used to populate the supplier portal's property switcher.</summary>
    Task<IEnumerable<Property>> GetPropertiesForVendorAsync(Guid vendorId);

    /// <summary>Stores (or replaces) the printed PO document. Returns false if no PO
    /// with that id exists.</summary>
    Task<bool> SetDocumentAsync(Guid purchaseOrderId, byte[] content, string fileName);
    /// <summary>The uploaded document's bytes, or null if none was uploaded / the PO
    /// doesn't exist.</summary>
    Task<PurchaseOrderDocument?> GetDocumentAsync(Guid purchaseOrderId);
}

public interface IDeliveryNoteRepository
{
    Task<DeliveryNote?> GetByIdAsync(Guid id);
    Task<IEnumerable<DeliveryNote>> GetByPurchaseOrderAsync(Guid poId);
    Task<DeliveryNote> CreateAsync(DeliveryNote dn);
    Task<DeliveryNote> UpdateAsync(DeliveryNote dn);
    /// <summary>Cross-vendor lookup (by status and/or DN/PO number or vendor name)
    /// for internal staff — used by the governance console's receiving queue.</summary>
    Task<IEnumerable<DeliveryNote>> SearchAsync(string? status, string? search, int page, int pageSize);
    Task<int> SearchCountAsync(string? status, string? search);
}

public interface IInvoiceRepository
{
    Task<Invoice?> GetByIdAsync(Guid id);
    Task<IEnumerable<Invoice>> GetByVendorAsync(Guid vendorId, string? status, int page, int pageSize);
    Task<int> GetVendorInvoiceCountAsync(Guid vendorId, string? status);
    Task<Invoice> CreateAsync(Invoice invoice);
    Task<Invoice> UpdateAsync(Invoice invoice);
}

public interface IKycRepository
{
    Task<IEnumerable<Vendor>> GetKycQueueAsync(string? status, string? search, int page, int pageSize);
    Task<int> GetKycQueueCountAsync(string? status, string? search);
    Task<IEnumerable<VendorDocument>> GetDocumentsAsync(Guid vendorId);
    Task<VendorDocument> AddDocumentAsync(VendorDocument document);
}

public interface IMakerCheckerRepository
{
    Task<IEnumerable<KycChangeRequest>> GetPendingAsync();
    Task<KycChangeRequest?> GetByIdAsync(Guid id);
    Task<KycChangeRequest> CreateAsync(KycChangeRequest request);
    Task<KycChangeRequest> UpdateAsync(KycChangeRequest request);
}

public interface IItemRepository
{
    Task<Item?> GetByIdAsync(Guid id);
    Task<Item?> GetByCodeAsync(string code);
    Task<IEnumerable<Item>> SearchAsync(string? description, string? category, int page, int pageSize);
    Task<Item> CreateAsync(Item item);
    Task<Item> UpdateAsync(Item item);
}

public interface IDedupRepository
{
    Task<IEnumerable<VendorDedupCluster>> GetVendorClustersAsync(string? status);
    Task<VendorDedupCluster?> GetVendorClusterByIdAsync(Guid id);
    Task<VendorDedupCluster> CreateVendorClusterAsync(VendorDedupCluster cluster);
    Task<VendorDedupCluster> UpdateVendorClusterAsync(VendorDedupCluster cluster);
    Task<IEnumerable<ItemDedupCluster>> GetItemClustersAsync(string? status, string? category);
    Task<ItemDedupCluster?> GetItemClusterByIdAsync(Guid id);
    Task<ItemDedupCluster> CreateItemClusterAsync(ItemDedupCluster cluster);
    Task<ItemDedupCluster> UpdateItemClusterAsync(ItemDedupCluster cluster);
}

public interface INotificationRepository
{
    Task<Notification?> GetByIdAsync(Guid id);
    Task<IEnumerable<Notification>> GetByUserAsync(Guid userId, bool? unreadOnly);
    Task<int> GetUnreadCountAsync(Guid userId);
    Task MarkAllReadAsync(Guid userId);
    Task MarkAsReadAsync(Guid notificationId);
    Task<Notification> CreateAsync(Notification notification);
}

public interface IPaymentRepository
{
    Task<IEnumerable<Payment>> GetByVendorAsync(Guid vendorId, string? status);
    /// <summary>Payments made/scheduled against one specific invoice — shown as that
    /// invoice's adjustments in its detail view.</summary>
    Task<IEnumerable<Payment>> GetByInvoiceAsync(Guid invoiceId);
    Task<Payment?> GetNextScheduledAsync(Guid vendorId);
    Task<Payment> CreateAsync(Payment payment);
}

public interface IRateContractRepository
{
    Task<RateContract?> GetActiveForVendorAsync(Guid vendorId, Guid buyingEntityId);
    Task<decimal?> GetAgreedPriceAsync(Guid vendorId, Guid buyingEntityId, Guid itemId);
}
