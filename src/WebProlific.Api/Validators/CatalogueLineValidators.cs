using FluentValidation;
using WebProlific.Api.Controllers;

namespace WebProlific.Api.Validators;

/// <summary>
/// Server-side mirror of the client-side rules in catalogue-excel.service.ts, so the same
/// data is rejected identically whether it arrives via the manual "+ Add Line" form or a
/// bulk Excel upload — both funnel through POST /catalogues/{id}/lines.
/// </summary>
public class CatalogueLineInputValidator : AbstractValidator<CatalogueLineInput>
{
    public static readonly string[] SupportedCurrencies = { "INR", "AED" };
    public static readonly string[] SupportedTaxClasses = { "GST-0", "GST-5", "GST-12", "GST-18" };

    public CatalogueLineInputValidator()
    {
        RuleFor(x => x.ItemCode)
            .NotEmpty().WithMessage("Item code is required.")
            .Matches("^[a-zA-Z0-9-]+$").WithMessage("Item code must contain only letters, numbers, and dashes.");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Description is required.")
            .MaximumLength(255).WithMessage("Description must be 255 characters or fewer.");

        RuleFor(x => x.PackUom)
            .NotEmpty().WithMessage("Pack/UOM is required.");

        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Price must be greater than 0.")
            .Must(HaveAtMostTwoDecimalPlaces).WithMessage("Price must have at most 2 decimal places.");

        RuleFor(x => x.Currency)
            .NotEmpty().WithMessage("Currency is required.")
            .Must(c => SupportedCurrencies.Contains(c.Trim().ToUpperInvariant()))
            .WithMessage($"Currency must be one of: {string.Join(", ", SupportedCurrencies)}.");

        RuleFor(x => x.TaxClass)
            .NotEmpty().WithMessage("Tax class is required.")
            .Must(t => SupportedTaxClasses.Contains(t.Trim().ToUpperInvariant()))
            .WithMessage($"Tax class must be one of: {string.Join(", ", SupportedTaxClasses)}.");

        RuleFor(x => x.ValidFrom)
            .NotEqual(default(DateTime)).WithMessage("Valid-from date is required.");

        RuleFor(x => x.ValidTo)
            .NotEqual(default(DateTime)).WithMessage("Valid-to date is required.")
            .GreaterThanOrEqualTo(x => x.ValidFrom).WithMessage("Valid-to must be on or after valid-from.");
    }

    private static bool HaveAtMostTwoDecimalPlaces(decimal value) => value == Math.Round(value, 2);
}

public class AddCatalogueLinesRequestValidator : AbstractValidator<AddCatalogueLinesRequest>
{
    public const int MaxLinesPerRequest = 1000;

    public AddCatalogueLinesRequestValidator()
    {
        RuleFor(x => x.Lines)
            .NotEmpty().WithMessage("At least one line is required.")
            .Must(l => l.Count <= MaxLinesPerRequest)
            .WithMessage($"Cannot add more than {MaxLinesPerRequest} lines in a single request.");

        RuleForEach(x => x.Lines).SetValidator(new CatalogueLineInputValidator());
    }
}
