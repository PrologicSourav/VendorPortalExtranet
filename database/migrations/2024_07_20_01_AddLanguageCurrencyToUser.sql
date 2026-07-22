-- ══════════════════════════════════════════════════════════════════════
-- Migration 2024_07_20_01: Add LanguageCode and PreferredCurrencyCode to Users
-- ══════════════════════════════════════════════════════════════════════

USE WebProlific;
GO

-- Add LanguageCode column to Users table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'LanguageCode')
BEGIN
    ALTER TABLE Users ADD LanguageCode NVARCHAR(10) NOT NULL DEFAULT 'en';
    PRINT 'Added LanguageCode column to Users table';
END
ELSE
BEGIN
    PRINT 'LanguageCode column already exists in Users table';
END
GO

-- Add PreferredCurrencyCode column to Users table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'PreferredCurrencyCode')
BEGIN
    ALTER TABLE Users ADD PreferredCurrencyCode NVARCHAR(10) NOT NULL DEFAULT 'INR';
    PRINT 'Added PreferredCurrencyCode column to Users table';
END
ELSE
BEGIN
    PRINT 'PreferredCurrencyCode column already exists in Users table';
END
GO

-- Create index on LanguageCode for faster lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_LanguageCode' AND object_id = OBJECT_ID('Users'))
BEGIN
    CREATE INDEX IX_Users_LanguageCode ON Users(LanguageCode);
    PRINT 'Created index on LanguageCode column';
END
GO

-- Create index on PreferredCurrencyCode for faster lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_PreferredCurrencyCode' AND object_id = OBJECT_ID('Users'))
BEGIN
    CREATE INDEX IX_Users_PreferredCurrencyCode ON Users(PreferredCurrencyCode);
    PRINT 'Created index on PreferredCurrencyCode column';
END
GO

PRINT 'Migration 2024_07_20_01 completed successfully';
GO
