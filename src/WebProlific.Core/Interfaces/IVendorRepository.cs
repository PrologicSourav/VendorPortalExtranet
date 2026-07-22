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
    Task<Catalogue> CreateAsync(Catalogue catalogue);
    Task<Catalogue> UpdateAsync(Catalogue catalogue);
}

public interface IPurchaseOrderRepository
{
    Task<PurchaseOrder?> GetByIdAsync(Guid id);
    Task<PurchaseOrder?> GetByPoNumberAsync(string poNumber);
    Task<IEnumerable<PurchaseOrder>> GetByVendorAsync(Guid vendorId, string? status, int page, int pageSize);
    Task<int> GetVendorPoCountAsync(Guid vendorId, string? status);
    Task<PurchaseOrder> CreateAsync(PurchaseOrder po);
    Task<PurchaseOrder> UpdateAsync(PurchaseOrder po);
}

public interface IDeliveryNoteRepository
{
    Task<DeliveryNote?> GetByIdAsync(Guid id);
    Task<IEnumerable<DeliveryNote>> GetByPurchaseOrderAsync(Guid poId);
    Task<DeliveryNote> CreateAsync(DeliveryNote dn);
    Task<DeliveryNote> UpdateAsync(DeliveryNote dn);
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
    Task<Payment?> GetNextScheduledAsync(Guid vendorId);
    Task<Payment> CreateAsync(Payment payment);
}

public interface IRateContractRepository
{
    Task<RateContract?> GetActiveForVendorAsync(Guid vendorId, Guid buyingEntityId);
    Task<decimal?> GetAgreedPriceAsync(Guid vendorId, Guid buyingEntityId, Guid itemId);
}
