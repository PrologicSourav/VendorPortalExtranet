using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace WebProlific.Api.Filters;

/// <summary>
/// Action filter that logs the execution time of controller actions.
/// Useful for performance monitoring of API endpoints.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class LogExecutionTimeAttribute : Attribute, IAsyncActionFilter
{
    private readonly ILogger<LogExecutionTimeAttribute> _logger;

    public LogExecutionTimeAttribute(ILogger<LogExecutionTimeAttribute> logger)
    {
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        var stopwatch = Stopwatch.StartNew();
        var actionName = context.ActionDescriptor.DisplayName;
        var controllerName = context.Controller?.GetType().Name ?? "Unknown";

        // Log action start
        _logger.LogInformation(
            "Executing action {Controller}.{Action} [Parameters: {Parameters}]",
            controllerName, actionName,
            string.Join(", ", context.ActionArguments.Select(kvp => $"{kvp.Key}={kvp.Value}")));

        try
        {
            var resultContext = await next();

            stopwatch.Stop();
            var elapsedMs = stopwatch.ElapsedMilliseconds;

            // Log successful completion
            _logger.LogInformation(
                "Action {Controller}.{Action} completed successfully in {ElapsedMs}ms [Status: {StatusCode}]",
                controllerName, actionName, elapsedMs, resultContext.HttpContext.Response.StatusCode);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            var elapsedMs = stopwatch.ElapsedMilliseconds;

            // Log exception
            _logger.LogError(
                ex,
                "Action {Controller}.{Action} failed after {ElapsedMs}ms: {ExceptionMessage}",
                controllerName, actionName, elapsedMs, ex.Message);

            throw; // Re-throw for global exception middleware
        }
    }
}

/// <summary>
/// Extension method to add the LogExecutionTime filter globally or via DI.
/// </summary>
public static class LogExecutionTimeExtensions
{
    public static IMvcBuilder AddExecutionTimeLogging(this IMvcBuilder builder)
    {
        builder.Services.AddScoped<LogExecutionTimeAttribute>();
        return builder;
    }
}