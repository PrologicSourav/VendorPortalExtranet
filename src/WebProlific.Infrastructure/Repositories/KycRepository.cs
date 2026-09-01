using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class KycRepository : IKycRepository
{
    private readonly AppDbContext _db;

    public KycRepository(AppDbContext db) => _db = db;

    public async Task<IEnumerable<Vendor>> GetKycQueueAsync(string? status, string? search, int page, int pageSize, Guid? propertyId = null, Guid? buyingEntityId = null)
    {
        var query = BuildQueueQuery(status, search, propertyId, buyingEntityId);
        var ordered = query.OrderByDescending(v => v.UpdatedAt);
        // Page 1 uses TOP (SELECT TOP n) rather than OFFSET/FETCH, which the SQL
        // Server 2008 R2 engine does not support — same pattern as
        // PurchaseOrderRepository.GetByVendorAsync.
        IQueryable<Vendor> paged = page > 1 ? ordered.Skip((page - 1) * pageSize) : ordered;
        return await paged.Take(pageSize).ToListAsync();
    }

    public async Task<int> GetKycQueueCountAsync(string? status, string? search, Guid? propertyId = null, Guid? buyingEntityId = null) =>
        await BuildQueueQuery(status, search, propertyId, buyingEntityId).CountAsync();

    private IQueryable<Vendor> BuildQueueQuery(string? status, string? search, Guid? propertyId, Guid? buyingEntityId)
    {
        var query = _db.Vendors.AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<KycStatus>(status, true, out var kycStatus))
            query = query.Where(v => v.KycStatus == kycStatus);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(v => v.LegalName.Contains(search) ||
                (v.Gstin != null && v.Gstin.Contains(search)));

        // Vendor itself carries no property/chain link — "relevant to this
        // property" means having a relationship or request that touches it or
        // its chain, either as the property itself or a chain-wide grant.
        if (propertyId.HasValue || buyingEntityId.HasValue)
        {
            query = query.Where(v =>
                _db.VendorRelationships.Any(r => r.VendorId == v.Id &&
                    (r.PropertyId == propertyId || r.BuyingEntityId == buyingEntityId)) ||
                _db.VendorRequests.Any(r => r.VendorId == v.Id &&
                    (r.RequestedPropertyId == propertyId || r.RequestedBuyingEntityId == buyingEntityId)));
        }

        return query;
    }

    public async Task<IEnumerable<VendorDocument>> GetDocumentsAsync(Guid vendorId) =>
        await _db.VendorDocuments.Where(d => d.VendorId == vendorId).ToListAsync();

    public async Task<VendorDocument> AddDocumentAsync(VendorDocument document)
    {
        _db.VendorDocuments.Add(document);
        await _db.SaveChangesAsync();
        return document;
    }
}
