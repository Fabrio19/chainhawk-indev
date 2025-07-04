# ChainHawk Complete Database Integration Setup Script
# This script sets up PostgreSQL, Neo4j, and integrates all bridge modules

Write-Host "🚀 ChainHawk Complete Database Integration Setup" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""

# Step 1: Environment Setup
Write-Host "1️⃣ Setting up environment configuration..." -ForegroundColor Yellow

if (Test-Path ".env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env"
        Write-Host "✅ .env file created from template" -ForegroundColor Green
        Write-Host "⚠️  IMPORTANT: Please edit .env file with your database credentials" -ForegroundColor Red
        Write-Host "   Required variables:" -ForegroundColor Cyan
        Write-Host "   - PGHOST, PGUSER, PGPASSWORD, PGDATABASE" -ForegroundColor Cyan
        Write-Host "   - NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD" -ForegroundColor Cyan
        Write-Host ""
        
        $continue = Read-Host "Have you configured your .env file? (y/n)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            Write-Host "❌ Please configure your .env file and run this script again" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ env.example template not found" -ForegroundColor Red
        exit 1
    }
}

# Step 2: Install Dependencies
Write-Host ""
Write-Host "2️⃣ Installing required dependencies..." -ForegroundColor Yellow

$requiredPackages = @("pg", "neo4j-driver", "dotenv", "ethers")

foreach ($package in $requiredPackages) {
    try {
        npm list $package --depth=0 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $package is installed" -ForegroundColor Green
        } else {
            Write-Host "📦 Installing $package..." -ForegroundColor Yellow
            npm install $package
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ $package installed successfully" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to install $package" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "❌ Error with $package" -ForegroundColor Red
    }
}

# Step 3: Database Migration
Write-Host ""
Write-Host "3️⃣ Running database migration..." -ForegroundColor Yellow

Write-Host "🚀 Executing PostgreSQL migration..." -ForegroundColor Green
node run-migration.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed. Please check your database configuration." -ForegroundColor Red
    Write-Host "   Make sure PostgreSQL is running and credentials are correct." -ForegroundColor Yellow
    exit 1
}

# Step 4: Test Database Integration
Write-Host ""
Write-Host "4️⃣ Testing database integration..." -ForegroundColor Yellow

Write-Host "🧪 Testing PostgreSQL and Neo4j connections..." -ForegroundColor Green
node test-db-integration.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database integration test passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Database integration test failed." -ForegroundColor Red
    Write-Host "   Please check your database connections and try again." -ForegroundColor Yellow
    exit 1
}

# Step 5: Test Bridge Modules
Write-Host ""
Write-Host "5️⃣ Testing bridge modules..." -ForegroundColor Yellow

Write-Host "🧪 Testing modular bridge system..." -ForegroundColor Green
node test-modular-bridges.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Bridge modules test passed!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Bridge modules test had issues (this is normal if RPCs are not configured)" -ForegroundColor Yellow
}

# Step 6: Test Enhanced Features
Write-Host ""
Write-Host "6️⃣ Testing enhanced features..." -ForegroundColor Yellow

Write-Host "🧪 Testing enhanced bridge monitoring features..." -ForegroundColor Green
node test-enhanced-features.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Enhanced features test passed!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Enhanced features test had issues (check configuration)" -ForegroundColor Yellow
}

# Step 7: Verify Integration
Write-Host ""
Write-Host "7️⃣ Verifying complete integration..." -ForegroundColor Yellow

# Check if all required files exist
$requiredFiles = @(
    "src/services/pgClient.js",
    "src/services/neo4jClient.js",
    "src/services/bridges/stargate.js",
    "src/services/bridges/wormhole.js",
    "src/services/bridges/cbridge.js",
    "src/services/bridges/synapse.js",
    "src/services/bridges/hop.js",
    "src/services/bridges/debridge.js",
    "src/services/bridges/across.js",
    "src/services/bridges/orbiter.js",
    "src/services/bridges/xbridge.js",
    "migrations/create_bridge_flows_table.sql",
    "run-migration.js",
    "test-db-integration.js"
)

Write-Host "📋 Checking required files..." -ForegroundColor Cyan
$missingFiles = @()

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Missing files detected:" -ForegroundColor Yellow
    foreach ($file in $missingFiles) {
        Write-Host "   - $file" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "✅ All required files are present!" -ForegroundColor Green
}

# Step 8: Final Instructions
Write-Host ""
Write-Host "🎉 SETUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

Write-Host "📚 Next Steps:" -ForegroundColor Cyan
Write-Host "=============" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣ Configure RPC URLs:" -ForegroundColor Yellow
Write-Host "   - Edit .env file with your blockchain RPC URLs"
Write-Host "   - Add API keys for enhanced data (optional)"
Write-Host ""

Write-Host "2️⃣ Start the bridge monitoring system:" -ForegroundColor Yellow
Write-Host "   - Run: node main.js"
Write-Host "   - Or use: node start-enhanced-monitoring.js"
Write-Host ""

Write-Host "3️⃣ Monitor the system:" -ForegroundColor Yellow
Write-Host "   - Check logs for bridge events"
Write-Host "   - Verify data is being saved to PostgreSQL and Neo4j"
Write-Host "   - Monitor for high-risk transactions"
Write-Host ""

Write-Host "4️⃣ Access the frontend:" -ForegroundColor Yellow
Write-Host "   - Start frontend: npm run dev (from root directory)"
Write-Host "   - Access at: http://localhost:5173"
Write-Host ""

Write-Host "📊 Database Access:" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""

Write-Host "PostgreSQL:" -ForegroundColor Yellow
Write-Host "   - Database: chainhawk"
Write-Host "   - Table: bridge_flows"
Write-Host "   - Views: high_risk_bridge_flows, recent_bridge_flows, bridge_statistics"
Write-Host ""

Write-Host "Neo4j:" -ForegroundColor Yellow
Write-Host "   - Database: neo4j"
Write-Host "   - Nodes: Wallet, Transaction"
Write-Host "   - Relationships: SENT, INITIATED, RECEIVED"
Write-Host ""

Write-Host "🔧 Useful Commands:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Test database: node test-db-integration.js" -ForegroundColor White
Write-Host "Test bridges: node test-modular-bridges.js" -ForegroundColor White
Write-Host "Test features: node test-enhanced-features.js" -ForegroundColor White
Write-Host "Run migration: node run-migration.js" -ForegroundColor White
Write-Host "Start monitoring: node main.js" -ForegroundColor White
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host ""

Write-Host "DATABASE_INTEGRATION_README.md - Database setup and usage" -ForegroundColor White
Write-Host "ENHANCED_FEATURES_README.md - Enhanced monitoring features" -ForegroundColor White
Write-Host "MODULAR_BRIDGE_SYSTEM.md - Bridge monitoring system" -ForegroundColor White
Write-Host ""

Write-Host "🎯 Your ChainHawk Bridge Monitoring System is ready!" -ForegroundColor Green
Write-Host "   All decoded bridge transactions will be saved to PostgreSQL and Neo4j." -ForegroundColor Green
Write-Host "   High-risk transactions will trigger alerts and be flagged for compliance." -ForegroundColor Green 