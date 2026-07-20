using System.Diagnostics;
using System.Security.Claims;

namespace WebProlific.Api.Middleware;

/// <summary>
/// Middleware that logs every HTTP request and response with timing information.
/// Logs: HTTP method, path, status code, execution time, client IP, user info.
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    private static readonly HashSet<string> SensitivePaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/forgot-password"
    };

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var request = context.Request;
        var correlationId = context.Items["CorrelationId"]?.ToString() ?? "N/A";
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
        var username = context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "anonymous";

        // Log the incoming request (skip body logging for sensitive endpoints)
        var isSensitive = SensitivePaths.Any(p => request.Path.StartsWithSegments(p, StringComparison.OrdinalIgnoreCase));

        using (_logger.BeginScope(new Dictionary<string, object?>
        {
            ["RequestId"] = Guid.NewGuid().ToString("N"),
            ["HttpMethod"] = request.Method,
            ["RequestPath"] = request.Path,
            ["ClientIp"] = clientIp,
            ["UserId"] = userId,
            ["Username"] = username
        }))
        {
            _logger.LogInformation(
                "HTTP {Method} {Path} started [Client: {ClientIp}] [User: {Username}]",
                request.Method, request.Path, clientIp, username);

            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                // Exception is re-thrown; global exception middleware will handle it
                _logger.LogError(ex, "Unhandled exception during {Method} {Path}", request.Method, request.Path);
                throw;
            }
            finally
            {
                stopwatch.Stop();
                var statusCode = context.Response.StatusCode;
                var elapsed = stopwatch.ElapsedMilliseconds;

                var logLevel = statusCode switch
                {
                    >= 500 => LogLevel.Error,
                    >= 400 => LogLevel.Warning,
                    _ => LogLevel.Information
                };

                _logger.Log(
                    logLevel,
                    "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs}ms [Client: {ClientIp}] User: {Username}",
                    request.Method, request.Path, statusCode, elapsed, clientIp, username);
            }
        }
    }
}

/// <summary>
/// Extension method for RequestLoggingMiddleware.
/// </summary>
public static class RequestLoggingMiddlewareExtensions
{
    public static IApplicationBuilder UseRequestLogging(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<RequestLoggingMiddleware>();
    }
}