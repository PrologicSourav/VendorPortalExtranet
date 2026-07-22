using System.ComponentModel.DataAnnotations;
using WebProlific.Core.Entities;

namespace WebProlific.Core.Entities;

public class UserPreference
{
    [Key]
    public Guid UserId { get; set; }
    public string LanguageCode { get; set; } = "en";
    public string PreferredCurrencyCode { get; set; } = "INR";
}
