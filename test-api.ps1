# Test script for WebProlific API
$baseUrl = "http://localhost:5000/api"

Write-Host "Testing WebProlific API..." -ForegroundColor Cyan

# Test 1: Get languages
Write-Host "`n1. Testing GET /api/configuration/languages" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/configuration/languages" -Method Get
    Write-Host "✓ Success: $($response.Count) languages returned" -ForegroundColor Green
    $response | ForEach-Object { Write-Host "  - $($_.code): $($_.name)" }
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}

# Test 2: Get currencies
Write-Host "`n2. Testing GET /api/configuration/currencies" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/configuration/currencies" -Method Get
    Write-Host "✓ Success: $($response.Count) currencies returned" -ForegroundColor Green
    $response | ForEach-Object { Write-Host "  - $($_.code): $($_.name) ($($_.symbol))" }
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}

# Test 3: Register a new user
Write-Host "`n3. Testing POST /api/auth/register" -ForegroundColor Yellow
$registerBody = @{
    email = "test@example.com"
    password = "Test123456"
    displayName = "Test User"
    companyName = "Test Company Ltd"
    gstin = "TESTGST12345M"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "✓ Success: User registered" -ForegroundColor Green
    Write-Host "  User ID: $($response.user.id)"
    Write-Host "  Email: $($response.user.email)"
    Write-Host "  Role: $($response.user.role)"
    $testUserId = $response.user.id
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}

# Test 4: Login
Write-Host "`n4. Testing POST /api/auth/login" -ForegroundColor Yellow
$loginBody = @{
    email = "test@example.com"
    password = "Test123456"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "✓ Success: Login successful" -ForegroundColor Green
    Write-Host "  Token: $($response.token.Substring(0, 50))..."
    Write-Host "  User ID: $($response.user.id)"
    Write-Host "  Role: $($response.user.role)"
    $testToken = $response.token
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}

# Test 5: Get vendors (requires auth)
Write-Host "`n5. Testing GET /api/vendors" -ForegroundColor Yellow
if ($testToken) {
    try {
        $headers = @{ "Authorization" = "Bearer $testToken" }
        $response = Invoke-RestMethod -Uri "$baseUrl/vendors" -Method Get -Headers $headers
        Write-Host "✓ Success: $($response.total) vendors found" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Skipped: No valid token" -ForegroundColor Yellow
}

# Test 6: Create a vendor (requires auth)
Write-Host "`n6. Testing POST /api/vendors" -ForegroundColor Yellow
if ($testToken) {
    $vendorBody = @{
        legalName = "New Test Vendor"
        tradingName = "New Test Trading"
        gstin = "NEWGST67890M"
        address = "123 Test Street"
        city = "Mumbai"
        state = "Maharashtra"
        contactEmail = "vendor@test.com"
        contactPhone = "+919876543210"
    } | ConvertTo-Json

    try {
        $headers = @{ "Authorization" = "Bearer $testToken" }
        $response = Invoke-RestMethod -Uri "$baseUrl/vendors" -Method Post -Body $vendorBody -Headers $headers -ContentType "application/json"
        Write-Host "✓ Success: Vendor created" -ForegroundColor Green
        Write-Host "  Vendor ID: $($response.id)"
        Write-Host "  Legal Name: $($response.legalName)"
        $testVendorId = $response.id
    } catch {
        Write-Host "✗ Failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Skipped: No valid token" -ForegroundColor Yellow
}

# Test 7: Get vendor by ID
Write-Host "`n7. Testing GET /api/vendors/{id}" -ForegroundColor Yellow
if ($testToken -and $testVendorId) {
    try {
        $headers = @{ "Authorization" = "Bearer $testToken" }
        $response = Invoke-RestMethod -Uri "$baseUrl/vendors/$testVendorId" -Method Get -Headers $headers
        Write-Host "✓ Success: Vendor retrieved" -ForegroundColor Green
        Write-Host "  ID: $($response.id)"
        Write-Host "  Legal Name: $($response.legalName)"
        Write-Host "  GSTIN: $($response.gstin)"
    } catch {
        Write-Host "✗ Failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Skipped: No valid token or vendor ID" -ForegroundColor Yellow
}

# Test 8: Update vendor
Write-Host "`n8. Testing PUT /api/vendors/{id}" -ForegroundColor Yellow
if ($testToken -and $testVendorId) {
    $updateBody = @{
        legalName = "Updated Test Vendor"
        tradingName = "Updated Test Trading"
        address = "456 Updated Street"
        city = "Delhi"
        state = "Delhi"
        contactEmail = "updated@test.com"
        contactPhone = "+919876543211"
    } | ConvertTo-Json

    try {
        $headers = @{ "Authorization" = "Bearer $testToken" }
        $response = Invoke-RestMethod -Uri "$baseUrl/vendors/$testVendorId" -Method Put -Body $updateBody -Headers $headers -ContentType "application/json"
        Write-Host "✓ Success: Vendor updated" -ForegroundColor Green
        Write-Host "  Legal Name: $($response.legalName)"
        Write-Host "  City: $($response.city)"
    } catch {
        Write-Host "✗ Failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Skipped: No valid token or vendor ID" -ForegroundColor Yellow
}

Write-Host "`n" + "="*50
Write-Host "API Testing Complete!" -ForegroundColor Cyan
