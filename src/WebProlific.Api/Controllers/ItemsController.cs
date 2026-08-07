using Microsoft.AspNetCore.Mvc;
using WebProlific.Core.Interfaces;

namespace WebProlific.Api.Controllers;

// The Web Prol'IFIC master item list is shared reference data. Any authenticated user
// (suppliers included) may search it to map a catalogue line to a known item; it is not
// vendor-specific, so there is no per-vendor authorization here.
[ApiController]
[Route("api/[controller]")]
public class ItemsController : ControllerBase
{
    private readonly IItemRepository _items;

    public ItemsController(IItemRepository items) => _items = items;

    /// <summary>Search the master item list by description (and optionally category),
    /// used by the catalogue line-mapping picker.</summary>
    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        pageSize = Math.Clamp(pageSize, 1, 50);

        var items = await _items.SearchAsync(search, category, page, pageSize);
        var result = items.Select(i => new ItemDto
        {
            Id = i.Id,
            ItemCode = i.ItemCode,
            Description = i.Description,
            Category = i.Category,
            BaseUom = i.BaseUom,
            PackSize = i.PackSize,
        });
        return Ok(result);
    }
}

public class ItemDto
{
    public Guid Id { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string BaseUom { get; set; } = string.Empty;
    public string? PackSize { get; set; }
}
