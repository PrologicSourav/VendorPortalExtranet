using Microsoft.EntityFrameworkCore;
using WebProlific.Core.Entities;
using WebProlific.Core.Interfaces;
using WebProlific.Infrastructure.Data;

namespace WebProlific.Infrastructure.Repositories;

public class ItemRepository : IItemRepository
{
    private readonly AppDbContext _db;

    public ItemRepository(AppDbContext db) => _db = db;

    public async Task<Item?> GetByIdAsync(Guid id) =>
        await _db.Items.FindAsync(id);

    public async Task<Item?> GetByCodeAsync(string code) =>
        await _db.Items.FirstOrDefaultAsync(i => i.ItemCode == code);

    public async Task<IEnumerable<Item>> SearchAsync(string? description, string? category, int page, int pageSize)
    {
        var query = _db.Items.AsQueryable();

        if (!string.IsNullOrEmpty(description))
            query = query.Where(i => i.Description.Contains(description));

        if (!string.IsNullOrEmpty(category))
            query = query.Where(i => i.Category == category);

        return await query
            .OrderBy(i => i.ItemCode)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<Item> CreateAsync(Item item)
    {
        _db.Items.Add(item);
        await _db.SaveChangesAsync();
        return item;
    }

    public async Task<Item> UpdateAsync(Item item)
    {
        _db.Items.Update(item);
        await _db.SaveChangesAsync();
        return item;
    }
}
