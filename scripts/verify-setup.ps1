# Quick Setup Verification Script for Clerk OAuth Implementation
# Run this script to verify your setup on Windows

Write-Host "`n🔍 Checking Clerk OAuth Implementation Setup" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$allChecksPass = $true

# Check if .env exists
if (-Not (Test-Path .env)) {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Write-Host "   Create .env file with:" -ForegroundColor Yellow
    Write-Host "   CLERK_SECRET_KEY=sk_test_xxxxx" -ForegroundColor Yellow
    Write-Host "   JWT_SECRET=your_secret_key" -ForegroundColor Yellow
    Write-Host "   JWT_REFRESH_SECRET=your_refresh_secret" -ForegroundColor Yellow
    $allChecksPass = $false
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    
    # Check for CLERK_SECRET_KEY
    $envContent = Get-Content .env -Raw
    if ($envContent -match "CLERK_SECRET_KEY=") {
        Write-Host "✅ CLERK_SECRET_KEY configured" -ForegroundColor Green
    } else {
        Write-Host "❌ CLERK_SECRET_KEY not found in .env" -ForegroundColor Red
        $allChecksPass = $false
    }
    
    # Check for JWT_SECRET
    if ($envContent -match "JWT_SECRET=") {
        Write-Host "✅ JWT_SECRET configured" -ForegroundColor Green
    } else {
        Write-Host "❌ JWT_SECRET not found in .env" -ForegroundColor Red
        $allChecksPass = $false
    }
}

# Check if @clerk/backend is installed
if (Test-Path "node_modules/@clerk/backend") {
    Write-Host "✅ @clerk/backend package installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  @clerk/backend not installed" -ForegroundColor Yellow
    Write-Host "   Run: npm install @clerk/backend" -ForegroundColor Yellow
    $allChecksPass = $false
}

# Check implementation files
Write-Host "`n📁 Checking implementation files:" -ForegroundColor Cyan

$filesToCheck = @(
    "src\services\clerkService.js",
    "src\controllers\authController.js",
    "src\routes\authRoutes.js",
    "src\services\jwtService.js"
)

foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file missing" -ForegroundColor Red
        $allChecksPass = $false
    }
}

Write-Host ""

if ($allChecksPass) {
    Write-Host "🎉 All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run database migration (see redis_auth_migration.sql)" -ForegroundColor White
    Write-Host "2. Start server: npm start" -ForegroundColor White
    Write-Host "3. Test endpoint: node scripts/test-clerk-auth.js <clerk_token>" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Some checks failed. Please fix the issues above." -ForegroundColor Red
    Write-Host ""
    exit 1
}
