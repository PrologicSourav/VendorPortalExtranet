-- ══════════════════════════════════════════════════════════════════════
-- Migration 2024_07_20_02: Add CurrencyCode to Monetary Tables
-- ══════════════════════════════════════════════════════════════════════

USE WebProlific;
GO

-- Add CurrencyCode column to PurchaseOrders table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PurchaseOrders') AND name = 'CurrencyCode')
BEGIN
    ALTER TABLE PurchaseOrders ADD CurrencyCode NVARCHAR(10) NOT NULL DEFAULT 'INR';
    PRINT 'Added CurrencyCode column to PurchaseOrders table';
END
ELSE
BEGIN
    PRINT 'CurrencyCode column already exists in PurchaseOrders table';
END
GO

-- Add CurrencyCode column to Invoices table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Invoices') AND name = 'CurrencyCode')
BEGIN
    ALTER TABLE Invoices ADD CurrencyCode NVARCHAR(10) NOT NULL DEFAULT 'INR';
    PRINT 'Added CurrencyCode column to Invoices table';
END
ELSE
BEGIN
    PRINT 'CurrencyCode column already exists in Invoices table';
END
GO

-- Add CurrencyCode column to Payments table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Payments') AND name = 'CurrencyCode')
BEGIN
    ALTER TABLE Payments ADD CurrencyCode NVARCHAR(10) NOT NULL DEFAULT 'INR';
    PRINT 'Added CurrencyCode column to Payments table';
END
ELSE
BEGIN
    PRINT 'CurrencyCode column already exists in Payments table';
END
GO

-- Add CurrencyCode column to CatalogueLines table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CatalogueLines') AND name = 'CurrencyCode')
BEGIN
    ALTER TABLE CatalogueLines ADD CurrencyCode NVARCHAR(10) NOT NULL DEFAULT 'INR';
    PRINT 'Added CurrencyCode column to CatalogueLines table';
END
ELSE
BEGIN
    PRINT 'CurrencyCode column already exists in CatalogueLines table';
END
GO

-- Add CurrencyCode column to RateContractLines table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('RateContractLines') AND name = 'CurrencyCode')
BEGIN
    ALTER TABLE RateContractLines ADD CurrencyCode NVARCHAR(10) NOT NULL DEFAULT 'INR';
    PRINT 'Added CurrencyCode column to RateContractLines table';
END
ELSE
BEGIN
    PRINT 'CurrencyCode column already exists in RateContractLines table';
END
GO

PRINT 'Migration 2024_07_20_02 completed successfully';
GO
