# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files first for better layer caching
COPY src/WebProlific.Api/WebProlific.Api.csproj src/WebProlific.Api/
COPY src/WebProlific.Core/WebProlific.Core.csproj src/WebProlific.Core/
COPY src/WebProlific.Infrastructure/WebProlific.Infrastructure.csproj src/WebProlific.Infrastructure/
COPY src/WebProlific.Shared/WebProlific.Shared.csproj src/WebProlific.Shared/
RUN dotnet restore src/WebProlific.Api/WebProlific.Api.csproj

# Copy everything and publish
COPY src/ src/
RUN dotnet publish src/WebProlific.Api/WebProlific.Api.csproj -c Release -o /app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://0.0.0.0:$PORT
ENV ASPNETCORE_ENVIRONMENT=Production
# Read at host bootstrap, before CreateBuilder() adds its default appsettings.json
# source (which defaults to reloadOnChange:true, i.e. an inotify watch). Render's
# free-tier containers hit the inotify instance limit and the process segfaults
# (exit 139) inside WebApplication.CreateBuilder before any app code can run —
# so this must be set as an env var, not in code after CreateBuilder returns.
ENV DOTNET_hostBuilder__reloadConfigOnChange=false

EXPOSE 8080

ENTRYPOINT ["dotnet", "WebProlific.Api.dll"]
