-- ══════════════════════════════════════════════════════════════════════
-- Web Prol'IFIC — SQL Server Database Schema
-- Enterprise Hospitality Procurement Platform
-- ══════════════════════════════════════════════════════════════════════

-- Create database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'WebProlific')
BEGIN
    CREATE DATABASE WebProlific;
END
GO

USE WebProlific;
GO

-- ─── Buying Entities & Properties ──────────────────────────────────
CREATE TABLE BuyingEntities (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Name NVARCHAR(200) NOT NULL,
    Code NVARCHAR(50) NOT NULL UNIQUE,
    Region NVARCHAR(100),
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE Properties (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    BuyingEntityId UNIQUEIDENTIFIER NOT NULL REFERENCES BuyingEntities(Id),
    Name NVARCHAR(200) NOT NULL,
    Code NVARCHAR(50),
    City NVARCHAR(100),
    IsActive BIT NOT NULL DEFAULT 1
);

-- ─── Vendors ───────────────────────────────────────────────────────
CREATE TABLE Vendors (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    LegalName NVARCHAR(200) NOT NULL,
    TradingName NVARCHAR(200),
    Gstin NVARCHAR(15) NULL UNIQUE,
    Pan NVARCHAR(10),
    Address NVARCHAR(500),
    City NVARCHAR(100),
    State NVARCHAR(100),
    Pincode NVARCHAR(10),
    Country NVARCHAR(50) DEFAULT 'India',
    ContactEmail NVARCHAR(200),
    ContactPhone NVARCHAR(20),
    IsMsme BIT,
    UdyamNumber NVARCHAR(50),
    KycStatus INT NOT NULL DEFAULT 0,  -- 0=Incomplete, 1=Validated, 2=Expired, 3=Blocked
    KycValidatedDate DATETIME2,
    KycExpiryDate DATETIME2,
    KycMissingItems NVARCHAR(500),
    BankAccountNumber NVARCHAR(30),
    BankIfsc NVARCHAR(15),
    BankName NVARCHAR(200),
    BankDetailsPendingChecker BIT DEFAULT 0,
    Status INT NOT NULL DEFAULT 0,  -- 0=Active, 1=Suspended, 2=Merged
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ─── Vendor Documents ──────────────────────────────────────────────
CREATE TABLE VendorDocuments (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    VendorId UNIQUEIDENTIFIER NOT NULL REFERENCES Vendors(Id),
    DocumentType NVARCHAR(100) NOT NULL,
    FileName NVARCHAR(200) NOT NULL,
    FileUrl NVARCHAR(500),
    UploadDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiryDate DATETIME2,
    IsVerified BIT NOT NULL DEFAULT 0
);

-- ─── Users ─────────────────────────────────────────────────────────
CREATE TABLE Users (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Email NVARCHAR(200) NOT NULL UNIQUE,
    DisplayName NVARCHAR(200) NOT NULL,
    PasswordHash NVARCHAR(200) NOT NULL,
    Role INT NOT NULL,
    VendorId UNIQUEIDENTIFIER REFERENCES Vendors(Id),
    IsInternal BIT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LastLoginAt DATETIME2
);

CREATE TABLE VendorUsers (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    VendorId UNIQUEIDENTIFIER NOT NULL REFERENCES Vendors(Id),
    ContactName NVARCHAR(200) NOT NULL,
    Email NVARCHAR(200) NOT NULL,
    Role INT NOT NULL,
    Status INT NOT NULL DEFAULT 0,  -- 0=Invited, 1=Active, 2=Suspended
    ScopedEntities NVARCHAR(MAX),  -- JSON array
    ScopedProperties NVARCHAR(MAX),  -- JSON array
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ─── Items ─────────────────────────────────────────────────────────
CREATE TABLE Items (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ItemCode NVARCHAR(50) NOT NULL UNIQUE,
    Description NVARCHAR(500) NOT NULL,
    NormalisedDescription NVARCHAR(500) NOT NULL,
    Category NVARCHAR(100) NOT NULL,
    BaseUom NVARCHAR(20) NOT NULL,
    PackSize NVARCHAR(50),
    KeySpecs NVARCHAR(500),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ─── Rate Contracts ────────────────────────────────────────────────
CREATE TABLE RateContracts (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    VendorId UNIQUEIDENTIFIER NOT NULL REFERENCES Vendors(Id),
    BuyingEntityId UNIQUEIDENTIFIER NOT NULL REFERENCES BuyingEntities(Id),
    ContractNumber NVARCHAR(100) NOT NULL,
    ValidFrom DATE NOT NULL,
    ValidTo DATE NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE RateContractLines (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    RateContractId UNIQUEIDENTIFIER NOT NULL REFERENCES RateContracts(Id),
    ItemId UNIQUEIDENTIFIER NOT NULL REFERENCES Items(Id),
    AgreedPrice DECIMAL(18,2) NOT NULL,
    Currency NVARCHAR(10) DEFAULT 'INR'
);

-- ─── Catalogues ────────────────────────────────────────────────────
CREATE TABLE Catalogues (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    VendorId UNIQUEIDENTIFIER NOT NULL REFERENCES Vendors(Id),
    BuyingEntityId UNIQUEIDENTIFIER NOT NULL REFERENCES BuyingEntities(Id),
    VersionLabel NVARCHAR(20) NOT NULL DEFAULT 'v1',
    Status INT NOT NULL DEFAULT 0,  -- 0=Draft, 1=Submitted, 2=Approved, 3=Rejected
    SubmittedDate DATETIME2,
    ApprovedDate DATETIME2,
    RejectionReason NVARCHAR(500),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE CatalogueLines (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    CatalogueId UNIQUEIDENTIFIER NOT NULL REFERENCES Catalogues(Id),
    ItemId UNIQUEIDENTIFIER REFERENCES Items(Id),
    ItemCode NVARCHAR(50) NOT NULL,
    Description NVARCHAR(500) NOT NULL,
    PackUom NVARCHAR(50) NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    Currency NVARCHAR(10) DEFAULT 'INR',
    ValidFrom DATE NOT NULL,
    ValidTo DATE NOT NULL,
    TaxClass NVARCHAR(50) NOT NULL,
    Status INT NOT NULL DEFAULT 0,
    ContractPrice DECIMAL(18,2),
    DeviationPercent DECIMAL(8,2)
);

-- ─── Purchase Orders ───────────────────────────────────────────────
CREATE TABLE PurchaseOrders (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    PoNumber NVARCHAR(50) NOT NULL UNIQUE,
    VendorId UNIQUEIDENTIFIER NOT NULL REFERENCES Vendors(Id),
    BuyingEntityId UNIQUEIDENTIFIER NOT NULL REFERENCES BuyingEntities(Id),
    PropertyId UNIQUEIDENTIFIER REFERENCES Properties(Id),
    OrderDate DATE NOT NULL,
    RequiredByDate DATE NOT NULL,
    TotalValue DECIMAL(18,2) NOT NULL,
    Currency NVARCHAR(10) DEFAULT 'INR',
    Status INT NOT NULL DEFAULT 0,
    AcknowledgmentReason NVARCHAR(500),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE PurchaseOrderLines (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    PurchaseOrderId UNIQUEIDENTIFIER NOT NULL REFERENCES PurchaseOrders(Id),
    ItemId UNIQUEIDENTIFIER REFERENCES Items(Id),
    ItemDescription NVARCHAR(500) NOT NULL,
    QtyOrdered DECIMAL(18,2) NOT NULL,
    QtyAccepted DECIMAL(18,2) DEFAULT 0,
    QtyDelivered DECIMAL(18,2) DEFAULT 0,
    Uom NVARCHAR(20) NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    LineTotal DECIMAL(18,2) NOT NULL,
    AcceptanceReason NVARCHAR(500)
);

-- ─── Delivery Notes / ASN ──────────────────────────────────────────
CREATE TABLE DeliveryNotes (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    DeliveryNoteNumber NVARCHAR(50) NOT NULL,
    PurchaseOrderId UNIQUEIDENTIFIER NOT NULL REFERENCES PurchaseOrders(Id),
    VendorId UNIQUEIDENTIFIER NOT NULL REFERENCES Vendors(Id),
    ExpectedDeliveryDate DATE NOT NULL,
    TimeWindowStart NVARCHAR(10),
    TimeWindowEnd NVARCHAR(10),
    Status INT NOT NULL DEFAULT 0,
    SupportingDocumentUrl NVARCHAR(500),
    Notes NVARCHAR(1000),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE DeliveryNoteLines (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    DeliveryNoteId UNIQUEIDENTIFIER NOT NULL REFERENCES DeliveryNotes(Id),
    ItemDescription NVARCHAR(500) NOT NULL,
    QtyInDelivery DECIMAL(18,2) NOT NULL,
    BatchLotNumber NVARCHAR(100),
    ExpiryDate DATE
);

-- ─── Invoices ──────────────────────────────────────────────────────
CREATE TABLE Invoices (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    InvoiceNumber NVARCHAR(50) NOT NULL,
    VendorId UNIQUEIDENTIFIER NOT NULL REFERENCES Vendors(Id),
    PurchaseOrderId UNIQUEIDENTIFIER NOT NULL REFERENCES PurchaseOrders(Id),
    InvoiceDate DATE NOT NULL,
    Currency NVARCHAR(10) DEFAULT 'INR',
    SubTotal DECIMAL(18,2) NOT NULL,
    TaxAmount DECIMAL(18,2) NOT NULL,
    TotalAmount DECIMAL(18,2) NOT NULL,
    Status INT NOT NULL DEFAULT 0,
    MatchStatus INT NOT NULL DEFAULT 0,
    MismatchReasons NVARCHAR(1000),
    InvoicePdfUrl NVARCHAR(500),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE InvoiceLines (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    InvoiceId UNIQUEIDENTIFIER NOT NULL REFERENCES Invoices(Id),
    ItemDescription NVARCHAR(500) NOT NULL,
    InvoicedQty DECIMAL(18,2) NOT NULL,
    InvoicedUnitPrice DECIMAL(18,2) NOT NULL,
    ExpectedQty DECIMAL(18,2) NOT NULL,
    ExpectedUnitPrice DECIMAL(18,2) NOT NULL,
    LineTotal DECIMAL(18,2) NOT NULL
);

-- ─── Payments ──────────────────────────────────────────────────────
CREATE TABLE Payments (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    PaymentReference NVARCHAR(50) NOT NULL,
    VendorId UNIQUEIDENTIFIER NOT NULL REFERENCES Vendors(Id),
    InvoiceId UNIQUEIDENTIFIER NOT NULL REFERENCES Invoices(Id),
    Amount DECIMAL(18,2) NOT NULL,
    Currency NVARCHAR(10) DEFAULT 'INR',
    Status INT NOT NULL DEFAULT 0,
    ScheduledDate DATE,
    PaidDate DATE,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ─── Notifications ─────────────────────────────────────────────────
CREATE TABLE Notifications (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    Type INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Detail NVARCHAR(500),
    TargetScreen NVARCHAR(100),
    TargetId NVARCHAR(100),
    IsRead BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ─── Maker-Checker (KYC Changes) ──────────────────────────────────
CREATE TABLE KycChangeRequests (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    VendorId UNIQUEIDENTIFIER NOT NULL REFERENCES Vendors(Id),
    FieldChanged NVARCHAR(100) NOT NULL,
    OldValue NVARCHAR(500) NOT NULL,
    NewValue NVARCHAR(500) NOT NULL,
    RequestedByUserId UNIQUEIDENTIFIER NOT NULL,
    RequestedBy NVARCHAR(200) NOT NULL,
    RequestedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    Status INT NOT NULL DEFAULT 0,
    ApprovedByUserId UNIQUEIDENTIFIER,
    ApprovedBy NVARCHAR(200),
    ActionDate DATETIME2,
    RejectionReason NVARCHAR(500),
    SupportingDocumentUrl NVARCHAR(500)
);

-- ─── Vendor De-duplication ─────────────────────────────────────────
CREATE TABLE VendorDedupClusters (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Status INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ResolvedAt DATETIME2,
    MergedIntoVendorId UNIQUEIDENTIFIER REFERENCES Vendors(Id)
);

CREATE TABLE VendorDedupCandidates (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ClusterId UNIQUEIDENTIFIER NOT NULL REFERENCES VendorDedupClusters(Id),
    VendorId UNIQUEIDENTIFIER NOT NULL REFERENCES Vendors(Id),
    SimilarityScore DECIMAL(5,2) NOT NULL,
    MatchedAttributes NVARCHAR(500),  -- JSON
    IsSource BIT NOT NULL DEFAULT 0
);

-- ─── Item De-duplication ───────────────────────────────────────────
CREATE TABLE ItemDedupClusters (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Status INT NOT NULL DEFAULT 0,
    ModelVersion NVARCHAR(50),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ResolvedAt DATETIME2,
    MergedIntoItemId UNIQUEIDENTIFIER REFERENCES Items(Id)
);

CREATE TABLE ItemDedupCandidates (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ClusterId UNIQUEIDENTIFIER NOT NULL REFERENCES ItemDedupClusters(Id),
    ItemId UNIQUEIDENTIFIER NOT NULL REFERENCES Items(Id),
    SimilarityScore DECIMAL(5,2) NOT NULL,
    MatchedAttributes NVARCHAR(500),  -- JSON
    IsSource BIT NOT NULL DEFAULT 0
);

-- ─── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IX_Vendors_KycStatus ON Vendors(KycStatus);
CREATE INDEX IX_Vendors_Status ON Vendors(Status);
CREATE INDEX IX_PurchaseOrders_VendorId ON PurchaseOrders(VendorId);
CREATE INDEX IX_PurchaseOrders_Status ON PurchaseOrders(Status);
CREATE INDEX IX_Invoices_VendorId ON Invoices(VendorId);
CREATE INDEX IX_Invoices_Status ON Invoices(Status);
CREATE INDEX IX_Catalogues_VendorId ON Catalogues(VendorId);
CREATE INDEX IX_Catalogues_Status ON Catalogues(Status);
CREATE INDEX IX_Notifications_UserId ON Notifications(UserId, IsRead);
CREATE INDEX IX_KycChangeRequests_Status ON KycChangeRequests(Status);
CREATE INDEX IX_VendorDedupClusters_Status ON VendorDedupClusters(Status);
CREATE INDEX IX_ItemDedupClusters_Status ON ItemDedupClusters(Status);

PRINT 'Database schema created successfully!';
GO
