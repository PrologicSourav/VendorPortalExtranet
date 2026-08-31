using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Api.Controllers;

/// <summary>Read-only chain/property reference list. Any authenticated user can
/// read it (the default [Authorize] fallback policy applies) — the governance
/// console uses it to attach a vendor to a chain/property, and vendor users use
/// it to pick what to request access to (Flow C). Names/codes only, nothing
/// sensitive, so vendor read access is fine.</summary>
[ApiController]
[Route("api/[controller]")]
public class BuyingEntitiesController : ControllerBase
{
    private readonly AppDbContext _db;

    public BuyingEntitiesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var entities = await _db.BuyingEntities
            .Include(be => be.Properties)
            .Where(be => be.IsActive)
            .OrderBy(be => be.Name)
            .Select(be => new
            {
                be.Id,
                be.Name,
                be.Code,
                Properties = be.Properties
                    .Where(p => p.IsActive)
                    .OrderBy(p => p.Name)
                    .Select(p => new { p.Id, p.Name, p.Code, p.City }),
            })
            .ToListAsync();

        return Ok(entities);
    }
}
