using System.Net;
using System.Text.Json;

namespace WebProlific.Api.Middleware;

/// <summary>
/// Global exception handling middleware.
/// Catches all unhandled exceptions, logs them with full details,
/// and returns a standardized JSON error response without exposing sensitive internals.
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IWebHostEnvironment _env;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger,
        IWebHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException)
        {
            // Client disconnected — not a real error, just log as info
            _logger.LogInformation(
                "Request cancelled by client: {Method} {Path}",
                context.Request.Method, context.Request.Path);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var correlationId = context.Items["CorrelationId"]?.ToString() ?? "N/A";
        var requestId = Guid.NewGuid().ToString("N");
        var userId = context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "anonymous";

        // Determine status code based on exception type
        var statusCode = exception switch
        {
            UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
            KeyNotFoundException => (int)HttpStatusCode.NotFound,
            ArgumentException or ArgumentNullException => (int)HttpStatusCode.BadRequest,
            InvalidOperationException => (int)HttpStatusCode.Conflict,
            _ => (int)HttpStatusCode.InternalServerError
        };

        // Log the full exception with all context
        _logger.LogError(
            exception,
            "Unhandled exception [RequestId: {RequestId}] [CorrelationId: {CorrelationId}] " +
            "[User: {UserId}] [Path: {Path}] [Method: {Method}]: {ExceptionMessage}",
            requestId, correlationId, userId,
            context.Request.Path, context.Request.Method, exception.Message);

        // Build a safe response — never expose stack traces or internals in production
        // In development, include the full exception for debugging
        object response;
        if (_env.IsDevelopment())
        {
            response = new
            {
                error = new
                {
                    id = requestId,
                    message = exception.Message,
                    detail = exception.ToString(),
                    code = statusCode
                }
            };
        }
        else
        {
            response = new
            {
                error = new
                {
                    id = requestId,
                    message = "An unexpected error occurred. Please contact support with the error ID.",
                    code = statusCode
                }
            };
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = statusCode;

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var json = JsonSerializer.Serialize(response, jsonOptions);

        await context.Response.WriteAsync(json);
    }
}

/// <summary>
/// Standardized error response DTO.
/// </summary>
public class ErrorResponse
{
    public ErrorDetail? Error { get; set; }
}

public class ErrorDetail
{
    public string Id { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int Code { get; set; }
}

/// <summary>
/// Extension method for GlobalExceptionMiddleware.
/// </summary>
public static class GlobalExceptionMiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<GlobalExceptionMiddleware>();
    }
}