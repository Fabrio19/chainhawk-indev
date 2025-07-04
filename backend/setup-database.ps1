# ChainHawk Database Setup Script for Windows PowerShell
# This script helps you set up PostgreSQL and Neo4j for the bridge monitoring system

Write-Host "🚀 ChainHawk Database Setup Script" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env"
        Write-Host "✅ .env file created from template" -ForegroundColor Green
        Write-Host "⚠️  Please edit .env file with your database credentials" -ForegroundColor Yellow
    } else {
        Write-Host "❌ env.example template not found" -ForegroundColor Red
        exit 1
    }
}

# Check if required packages are installed
Write-Host ""
Write-Host "📦 Checking required packages..." -ForegroundColor Yellow

$requiredPackages = @("pg", "neo4j-driver", "dotenv")

foreach ($package in $requiredPackages) {
    try {
        npm list $package --depth=0 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $package is installed" -ForegroundColor Green
        } else {
            Write-Host "❌ $package is not installed" -ForegroundColor Red
            Write-Host "📦 Installing $package..." -ForegroundColor Yellow
            npm install $package
        }
    } catch {
        Write-Host "❌ Error checking $package" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔧 Database Setup Instructions:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣ PostgreSQL Setup:" -ForegroundColor Yellow
Write-Host "   - Install PostgreSQL if not already installed"
Write-Host "   - Create a database named 'chainhawk'"
Write-Host "   - Create a user 'chainhawk_user' with password"
Write-Host "   - Grant all privileges on 'chainhawk' to 'chainhawk_user'"
Write-Host ""

Write-Host "2️⃣ Neo4j Setup:" -ForegroundColor Yellow
Write-Host "   - Install Neo4j Desktop or Neo4j Community Edition"
Write-Host "   - Create a new database"
Write-Host "   - Set username to 'neo4j' and set a password"
Write-Host "   - Ensure Neo4j is running on bolt://localhost:7687"
Write-Host ""

Write-Host "3️⃣ Environment Configuration:" -ForegroundColor Yellow
Write-Host "   - Edit the .env file with your database credentials"
Write-Host "   - Update PGHOST, PGUSER, PGPASSWORD, PGDATABASE"
Write-Host "   - Update NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD"
Write-Host ""

Write-Host "4️⃣ Run Migration:" -ForegroundColor Yellow
Write-Host "   - Execute: node run-migration.js"
Write-Host ""

Write-Host "5️⃣ Test Integration:" -ForegroundColor Yellow
Write-Host "   - Execute: node test-db-integration.js"
Write-Host ""

# Ask user if they want to proceed with migration
Write-Host ""
$proceed = Read-Host "Do you want to run the database migration now? (y/n)"

if ($proceed -eq "y" -or $proceed -eq "Y") {
    Write-Host ""
    Write-Host "🚀 Running database migration..." -ForegroundColor Green
    node run-migration.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        
        $test = Read-Host "Do you want to test the database integration? (y/n)"
        if ($test -eq "y" -or $test -eq "Y") {
            Write-Host ""
            Write-Host "🧪 Testing database integration..." -ForegroundColor Green
            node test-db-integration.js
        }
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed. Please check your database configuration." -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "📝 Please configure your .env file and run the migration manually:" -ForegroundColor Yellow
    Write-Host "   node run-migration.js" -ForegroundColor Cyan
    Write-Host "   node test-db-integration.js" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🎉 Setup script completed!" -ForegroundColor Green
Write-Host "📚 For more information, see DATABASE_INTEGRATION_README.md" -ForegroundColor Cyan 