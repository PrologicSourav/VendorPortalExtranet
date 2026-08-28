using Microsoft.AspNetCore.Mvc;
using WebProlific.Api.Extensions;
using WebProlific.Core.Interfaces;

namespace WebProlific.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentRepository _paymentRepo;

    public PaymentsController(IPaymentRepository paymentRepo) => _paymentRepo = paymentRepo;

    [HttpGet("vendor/{vendorId:guid}")]
    public async Task<IActionResult> GetByVendor(Guid vendorId, [FromQuery] string? status)
    {
        if (!User.CanAccessVendor(vendorId)) return Forbid();

        var payments = await _paymentRepo.GetByVendorAsync(vendorId, status);
        var items = payments.Select(p => new
        {
            p.Id,
            p.PaymentReference,
            p.InvoiceId,
            InvoiceNumber = p.Invoice?.InvoiceNumber,
            p.Amount,
            p.Currency,
            p.Status,
            p.ScheduledDate,
            p.PaidDate,
            p.CreatedAt,
        });
        return Ok(items);
    }
}
