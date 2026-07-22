using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;

namespace WebProlific.Api.Controllers;

// Vendor and item de-duplication is an internal governance function; suppliers never call this.
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "InternalOnly")]
public class DedupController : ControllerBase
{
    private readonly IDedupRepository _dedupRepo;
    private readonly IVendorRepository _vendorRepo;

    public DedupController(IDedupRepository dedupRepo, IVendorRepository vendorRepo)
    {
        _dedupRepo = dedupRepo;
        _vendorRepo = vendorRepo;
    }

    // ─── Vendor dedup ────────────────────────────────────────
    [HttpGet("vendor")]
    public async Task<IActionResult> GetVendorClusters([FromQuery] string? status)
    {
        var clusters = await _dedupRepo.GetVendorClustersAsync(status);
        return Ok(clusters);
    }

    [HttpGet("vendor/{id:guid}")]
    public async Task<IActionResult> GetVendorCluster(Guid id)
    {
        var cluster = await _dedupRepo.GetVendorClusterByIdAsync(id);
        return cluster is null ? NotFound() : Ok(cluster);
    }

    [HttpPut("vendor/{id:guid}/merge")]
    public async Task<IActionResult> MergeVendorCluster(Guid id, [FromBody] MergeVendorRequest request)
    {
        var cluster = await _dedupRepo.GetVendorClusterByIdAsync(id);
        if (cluster is null) return NotFound();

        // In production: re-point POs, GRNs, rate-contract lines to surviving vendor
        // Mark non-surviving vendors as Merged
        cluster.Status = DedupStatus.Merged;
        cluster.MergedIntoVendorId = request.SurvivingVendorId;
        cluster.ResolvedAt = DateTime.UtcNow;
        await _dedupRepo.UpdateVendorClusterAsync(cluster);

        return Ok(new { message = $"Vendor merge completed. All records re-pointed to surviving vendor." });
    }

    [HttpPut("vendor/{id:guid}/dismiss")]
    public async Task<IActionResult> DismissVendorCluster(Guid id)
    {
        var cluster = await _dedupRepo.GetVendorClusterByIdAsync(id);
        if (cluster is null) return NotFound();

        cluster.Status = DedupStatus.Dismissed;
        cluster.ResolvedAt = DateTime.UtcNow;
        await _dedupRepo.UpdateVendorClusterAsync(cluster);

        return Ok(new { message = "Cluster dismissed — not a duplicate" });
    }

    // ─── Item dedup ──────────────────────────────────────────
    [HttpGet("item")]
    public async Task<IActionResult> GetItemClusters([FromQuery] string? status, [FromQuery] string? category)
    {
        var clusters = await _dedupRepo.GetItemClustersAsync(status, category);
        return Ok(clusters);
    }

    [HttpGet("item/{id:guid}")]
    public async Task<IActionResult> GetItemCluster(Guid id)
    {
        var cluster = await _dedupRepo.GetItemClusterByIdAsync(id);
        return cluster is null ? NotFound() : Ok(cluster);
    }

    [HttpPut("item/{id:guid}/merge")]
    public async Task<IActionResult> MergeItemCluster(Guid id, [FromBody] MergeItemRequest request)
    {
        var cluster = await _dedupRepo.GetItemClusterByIdAsync(id);
        if (cluster is null) return NotFound();

        // In production: re-point GRNs, rate-contract lines, catalogue mappings
        cluster.Status = ItemDedupStatus.Merged;
        cluster.MergedIntoItemId = request.SurvivingItemId;
        cluster.ResolvedAt = DateTime.UtcNow;
        await _dedupRepo.UpdateItemClusterAsync(cluster);

        return Ok(new { message = "Item merge completed. All records re-pointed to surviving item." });
    }

    [HttpPut("item/{id:guid}/dismiss")]
    public async Task<IActionResult> DismissItemCluster(Guid id)
    {
        var cluster = await _dedupRepo.GetItemClusterByIdAsync(id);
        if (cluster is null) return NotFound();

        cluster.Status = ItemDedupStatus.Dismissed;
        cluster.ResolvedAt = DateTime.UtcNow;
        await _dedupRepo.UpdateItemClusterAsync(cluster);

        return Ok(new { message = "Cluster dismissed — not a duplicate" });
    }
}

public class MergeVendorRequest { public Guid SurvivingVendorId { get; set; } public string? Reason { get; set; } }
public class MergeItemRequest { public Guid SurvivingItemId { get; set; } public string? Reason { get; set; } public bool OverrideUomBoundary { get; set; } }
