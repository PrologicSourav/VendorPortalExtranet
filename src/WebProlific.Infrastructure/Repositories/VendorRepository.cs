using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;
using Microsoft.Extensions.Logging;

namespace WebProlific.Infrastructure.Repositories;

public class VendorRepository : IVendorRepository
{
    private readonly AppDbContext _db;
    private readonly ILogger<VendorRepository> _logger;

    public VendorRepository(AppDbContext db, ILogger<VendorRepository> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<Vendor?> GetByIdAsync(Guid id)
    {
        _logger.LogDebug("Getting vendor by ID: {VendorId}", id);
        var vendor = await _db.Vendors.Include(v => v.Documents).FirstOrDefaultAsync(v => v.Id == id);
        if (vendor == null)
        {
            _logger.LogDebug("Vendor not found with ID: {VendorId}", id);
        }
        else
        {
            _logger.LogDebug("Vendor retrieved: {VendorId} ({LegalName})", vendor.Id, vendor.LegalName);
        }
        return vendor;
    }

    public async Task<Vendor?> GetByGstinAsync(string gstin)
    {
        _logger.LogDebug("Getting vendor by GSTIN: {Gstin}", gstin ?? "null");
        var vendor = await _db.Vendors.FirstOrDefaultAsync(v => v.Gstin == gstin);
        if (vendor == null)
        {
            _logger.LogDebug("Vendor not found with GSTIN: {Gstin}", gstin ?? "null");
        }
        else
        {
            _logger.LogDebug("Vendor retrieved by GSTIN: {VendorId} ({LegalName})", vendor.Id, vendor.LegalName);
        }
        return vendor;
    }

    public async Task<IEnumerable<Vendor>> GetAllAsync(string? status, string? search, int page, int pageSize)
    {
        _logger.LogInformation("Getting vendors list - Status: {Status}, Search: {Search}, Page: {Page}, PageSize: {PageSize}", 
            status ?? "all", search ?? "none", page, pageSize);

        var query = _db.Vendors.AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<KycStatus>(status, true, out var kycStatus))
        {
            query = query.Where(v => v.KycStatus == kycStatus);
            _logger.LogDebug("Filtering by KYC status: {Status}", status);
        }

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(v => v.LegalName.Contains(search) || 
                (v.Gstin != null && v.Gstin.Contains(search)));
            _logger.LogDebug("Filtering by search term: {Search}", search);
        }

        var vendors = await query
            .OrderByDescending(v => v.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        _logger.LogInformation("Retrieved {Count} vendors (page {Page})", vendors.Count, page);
        return vendors;
    }

    public async Task<int> GetCountAsync(string? status, string? search)
    {
        _logger.LogDebug("Getting vendor count - Status: {Status}, Search: {Search}", 
            status ?? "all", search ?? "none");

        var query = _db.Vendors.AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<KycStatus>(status, true, out var kycStatus))
        {
            query = query.Where(v => v.KycStatus == kycStatus);
        }

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(v => v.LegalName.Contains(search) || 
                (v.Gstin != null && v.Gstin.Contains(search)));
        }

        var count = await query.CountAsync();
        _logger.LogDebug("Vendor count: {Count}", count);
        return count;
    }

    public async Task<Vendor> CreateAsync(Vendor vendor)
    {
        _logger.LogInformation("Creating new vendor: {LegalName} (GSTIN: {Gstin})", 
            vendor.LegalName, vendor.Gstin ?? "null");

        _db.Vendors.Add(vendor);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Vendor created successfully: {VendorId} ({LegalName})", vendor.Id, vendor.LegalName);
        return vendor;
    }

    public async Task<Vendor> UpdateAsync(Vendor vendor)
    {
        _logger.LogInformation("Updating vendor: {VendorId} ({LegalName})", vendor.Id, vendor.LegalName);

        _db.Vendors.Update(vendor);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Vendor updated successfully: {VendorId}", vendor.Id);
        return vendor;
    }

    public async Task<bool> ExistsByGstinAsync(string gstin, Guid? excludeId = null)
    {
        _logger.LogDebug("Checking if GSTIN exists: {Gstin} (excluding ID: {ExcludeId})", 
            gstin ?? "null", excludeId?.ToString() ?? "none");

        var exists = await _db.Vendors.AnyAsync(v => v.Gstin == gstin && (!excludeId.HasValue || v.Id != excludeId.Value));
        _logger.LogDebug("GSTIN {Gstin} exists: {Exists}", gstin ?? "null", exists);
        return exists;
    }
}
