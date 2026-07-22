-- ══════════════════════════════════════════════════════════════════════
-- Migration 2024_07_20_03: Create Currency and ExchangeRate Tables
-- ══════════════════════════════════════════════════════════════════════

USE WebProlific;
GO

-- Create Currency table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Currencies')
BEGIN
    CREATE TABLE Currencies (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        Code NVARCHAR(10) NOT NULL UNIQUE,
        Name NVARCHAR(50) NOT NULL,
        Symbol NVARCHAR(5) NOT NULL,
        DecimalPrecision TINYINT NOT NULL DEFAULT 2,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );

    -- Insert default currencies
    INSERT INTO Currencies (Code, Name, Symbol, DecimalPrecision, IsActive) VALUES
        ('USD', 'US Dollar', '$', 2, 1),
        ('EUR', 'Euro', '€', 2, 1),
        ('GBP', 'British Pound', '£', 2, 1),
        ('INR', 'Indian Rupee', '₹', 2, 1),
        ('AED', 'UAE Dirham', 'د.إ', 2, 1),
        ('VND', 'Vietnamese Dong', '₫', 0, 1),
        ('THB', 'Thai Baht', '฿', 2, 1);

    PRINT 'Created Currencies table and inserted default currencies';
END
ELSE
BEGIN
    PRINT 'Currencies table already exists';
END
GO

-- Create ExchangeRate table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ExchangeRates')
BEGIN
    CREATE TABLE ExchangeRates (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        FromCurrencyCode NVARCHAR(10) NOT NULL,
        ToCurrencyCode NVARCHAR(10) NOT NULL,
        Rate DECIMAL(18, 8) NOT NULL,
        ValidFrom DATETIME2 NOT NULL,
        ValidTo DATETIME2 NOT NULL,
        IsManual BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_ExchangeRates_FromCurrency FOREIGN KEY (FromCurrencyCode) REFERENCES Currencies(Code),
        CONSTRAINT FK_ExchangeRates_ToCurrency FOREIGN KEY (ToCurrencyCode) REFERENCES Currencies(Code),
        CONSTRAINT UQ_ExchangeRates UNIQUE (FromCurrencyCode, ToCurrencyCode, ValidFrom)
    );

    -- Create index for faster lookups
    CREATE INDEX IX_ExchangeRates_FromCurrency ON ExchangeRates(FromCurrencyCode);
    CREATE INDEX IX_ExchangeRates_ToCurrency ON ExchangeRates(ToCurrencyCode);
    CREATE INDEX IX_ExchangeRates_ValidPeriod ON ExchangeRates(ValidFrom, ValidTo);

    PRINT 'Created ExchangeRates table';
END
ELSE
BEGIN
    PRINT 'ExchangeRates table already exists';
END
GO

PRINT 'Migration 2024_07_20_03 completed successfully';
GO
