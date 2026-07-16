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

EXPOSE 8080

ENTRYPOINT ["dotnet", "WebProlific.Api.dll"]
