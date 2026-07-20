using Microsoft.Extensions.Logging;
using System.Data.Common;
using System.Data.SqlClient;
using System.Diagnostics;

namespace WebProlific.Api.Extensions;

/// <summary>
/// Extension methods for logging database operations.
/// These helpers can be used in repositories to log SQL queries, parameters, and execution times.
/// </summary>
public static class DatabaseLoggingExtensions
{
    /// <summary>
    /// Executes a SQL command with logging of parameters and execution time.
    /// Excludes sensitive parameters from logs (passwords, tokens, etc.).
    /// </summary>
    public static async Task<int> ExecuteWithLoggingAsync(
        this DbCommand command,
        ILogger logger,
        string operationName,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();

        // Log the command text and sanitized parameters
        logger.LogInformation(
            "Executing {Operation}: {CommandText}",
            operationName, command.CommandText);

        // Log parameters (excluding sensitive ones)
        var parameters = command.Parameters.Cast<DbParameter>()
            .Where(p => !IsSensitiveParameter(p.ParameterName))
            .Select(p => $"{p.ParameterName} = {FormatParameterValue(p.Value)}")
            .ToList();

        if (parameters.Any())
        {
            logger.LogInformation(
                "Parameters: {Parameters}",
                string.Join(", ", parameters));
        }

        try
        {
            var result = await command.ExecuteNonQueryAsync(cancellationToken);

            stopwatch.Stop();
            logger.LogInformation(
                "{Operation} completed in {ElapsedMs}ms. Rows affected: {RowsAffected}",
                operationName, stopwatch.ElapsedMilliseconds, result);

            return result;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            logger.LogError(
                ex,
                "{Operation} failed after {ElapsedMs}ms: {ExceptionMessage}",
                operationName, stopwatch.ElapsedMilliseconds, ex.Message);

            throw;
        }
    }

    /// <summary>
    /// Executes a SQL query with logging and returns the results.
    /// </summary>
    public static async Task<T> ExecuteScalarWithLoggingAsync<T>(
        this DbCommand command,
        ILogger logger,
        string operationName,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();

        logger.LogInformation(
            "Executing scalar {Operation}: {CommandText}",
            operationName, command.CommandText);

        try
        {
            var result = await command.ExecuteScalarAsync(cancellationToken);

            stopwatch.Stop();
            logger.LogInformation(
                "Scalar {Operation} completed in {ElapsedMs}ms. Result: {Result}",
                operationName, stopwatch.ElapsedMilliseconds, result);

            return (T)result;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            logger.LogError(
                ex,
                "Scalar {Operation} failed after {ElapsedMs}ms: {ExceptionMessage}",
                operationName, stopwatch.ElapsedMilliseconds, ex.Message);

            throw;
        }
    }

    /// <summary>
    /// Executes a SQL query that returns a reader with logging.
    /// </summary>
    public static async Task<DbDataReader> ExecuteReaderWithLoggingAsync(
        this DbCommand command,
        ILogger logger,
        string operationName,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();

        logger.LogInformation(
            "Executing reader {Operation}: {CommandText}",
            operationName, command.CommandText);

        try
        {
            var reader = await command.ExecuteReaderAsync(cancellationToken);

            stopwatch.Stop();
            logger.LogInformation(
                "Reader {Operation} completed in {ElapsedMs}ms.",
                operationName, stopwatch.ElapsedMilliseconds);

            return reader;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            logger.LogError(
                ex,
                "Reader {Operation} failed after {ElapsedMs}ms: {ExceptionMessage}",
                operationName, stopwatch.ElapsedMilliseconds, ex.Message);

            throw;
        }
    }

    private static bool IsSensitiveParameter(string parameterName)
    {
        var sensitiveNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "password", "pwd", "secret", "key", "token", "apikey",
            "creditcard", "cvv", "ssn", "socialsecurity", "pin",
            "otp", "authorization", "auth"
        };

        return sensitiveNames.Any(s => parameterName.Contains(s));
    }

    private static string FormatParameterValue(object? value)
    {
        if (value == null) return "NULL";
        if (value is string s) return $"'{s.Replace("'", "''")}'";
        if (value is DateTime dt) return $"'{dt:yyyy-MM-dd HH:mm:ss}'";
        if (value is Guid guid) return $"'{guid}'";
        return value.ToString() ?? "NULL";
    }
}

/// <summary>
/// Extension methods for logging external API calls.
/// </summary>
public static class ExternalApiLoggingExtensions
{
    /// <summary>
    /// Logs an outgoing HTTP request.
    /// </summary>
    public static void LogOutgoingRequest(
        this ILogger logger,
        HttpRequestMessage request,
        string correlationId)
    {
        logger.LogInformation(
            "Outgoing HTTP {Method} {Url} [CorrelationId: {CorrelationId}] " +
            "[Headers: {Headers}]",
            request.Method, request.RequestUri, correlationId,
            string.Join(", ", request.Headers.Select(h => $"{h.Key}: {string.Join(", ", h.Value)}")));
    }

    /// <summary>
    /// Logs an incoming HTTP response.
    /// </summary>
    public static void LogIncomingResponse(
        this ILogger logger,
        HttpResponseMessage response,
        string correlationId,
        long elapsedMs)
    {
        var logLevel = (int)response.StatusCode >= 500 ? LogLevel.Error :
                       (int)response.StatusCode >= 400 ? LogLevel.Warning :
                       LogLevel.Information;

        logger.Log(
            logLevel,
            "Incoming HTTP {StatusCode} {ReasonPhrase} [CorrelationId: {CorrelationId}] " +
            "[ElapsedMs: {ElapsedMs}] [Headers: {Headers}]",
            (int)response.StatusCode, response.ReasonPhrase, correlationId,
            elapsedMs,
            string.Join(", ", response.Headers.Select(h => $"{h.Key}: {string.Join(", ", h.Value)}")));
    }
}