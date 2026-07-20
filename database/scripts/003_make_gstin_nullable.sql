IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [BuyingEntities] (
    [Id] uniqueidentifier NOT NULL,
    [Name] nvarchar(max) NOT NULL,
    [Code] nvarchar(max) NOT NULL,
    [Region] nvarchar(max) NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_BuyingEntities] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [ItemDedupClusters] (
    [Id] uniqueidentifier NOT NULL,
    [Status] int NOT NULL,
    [ModelVersion] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [ResolvedAt] datetime2 NULL,
    [MergedIntoItemId] uniqueidentifier NULL,
    CONSTRAINT [PK_ItemDedupClusters] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Items] (
    [Id] uniqueidentifier NOT NULL,
    [ItemCode] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [NormalisedDescription] nvarchar(max) NOT NULL,
    [Category] nvarchar(max) NOT NULL,
    [BaseUom] nvarchar(max) NOT NULL,
    [PackSize] nvarchar(max) NULL,
    [KeySpecs] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Items] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Notifications] (
    [Id] uniqueidentifier NOT NULL,
    [UserId] uniqueidentifier NOT NULL,
    [Type] int NOT NULL,
    [Title] nvarchar(max) NOT NULL,
    [Detail] nvarchar(max) NULL,
    [TargetScreen] nvarchar(max) NULL,
    [TargetId] nvarchar(max) NULL,
    [IsRead] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Notifications] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Users] (
    [Id] uniqueidentifier NOT NULL,
    [Email] nvarchar(max) NOT NULL,
    [DisplayName] nvarchar(max) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [Role] int NOT NULL,
    [VendorId] uniqueidentifier NULL,
    [IsInternal] bit NOT NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [LastLoginAt] datetime2 NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [VendorDedupClusters] (
    [Id] uniqueidentifier NOT NULL,
    [Status] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [ResolvedAt] datetime2 NULL,
    [MergedIntoVendorId] uniqueidentifier NULL,
    CONSTRAINT [PK_VendorDedupClusters] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Vendors] (
    [Id] uniqueidentifier NOT NULL,
    [LegalName] nvarchar(200) NOT NULL,
    [TradingName] nvarchar(max) NULL,
    [Gstin] nvarchar(15) NULL,
    [Pan] nvarchar(10) NULL,
    [Address] nvarchar(max) NULL,
    [City] nvarchar(max) NULL,
    [State] nvarchar(max) NULL,
    [Pincode] nvarchar(max) NULL,
    [Country] nvarchar(max) NULL,
    [ContactEmail] nvarchar(max) NULL,
    [ContactPhone] nvarchar(max) NULL,
    [IsMsme] bit NULL,
    [UdyamNumber] nvarchar(max) NULL,
    [KycStatus] int NOT NULL,
    [KycValidatedDate] datetime2 NULL,
    [KycExpiryDate] datetime2 NULL,
    [KycMissingItems] nvarchar(max) NULL,
    [BankAccountNumber] nvarchar(max) NULL,
    [BankIfsc] nvarchar(max) NULL,
    [BankName] nvarchar(max) NULL,
    [BankDetailsPendingChecker] bit NULL,
    [Status] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Vendors] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Properties] (
    [Id] uniqueidentifier NOT NULL,
    [BuyingEntityId] uniqueidentifier NOT NULL,
    [Name] nvarchar(max) NOT NULL,
    [Code] nvarchar(max) NULL,
    [City] nvarchar(max) NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_Properties] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Properties_BuyingEntities_BuyingEntityId] FOREIGN KEY ([BuyingEntityId]) REFERENCES [BuyingEntities] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [ItemDedupCandidates] (
    [Id] uniqueidentifier NOT NULL,
    [ClusterId] uniqueidentifier NOT NULL,
    [ItemId] uniqueidentifier NOT NULL,
    [SimilarityScore] decimal(18,2) NOT NULL,
    [MatchedAttributes] nvarchar(max) NULL,
    [IsSource] bit NOT NULL,
    CONSTRAINT [PK_ItemDedupCandidates] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ItemDedupCandidates_ItemDedupClusters_ClusterId] FOREIGN KEY ([ClusterId]) REFERENCES [ItemDedupClusters] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ItemDedupCandidates_Items_ItemId] FOREIGN KEY ([ItemId]) REFERENCES [Items] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Catalogues] (
    [Id] uniqueidentifier NOT NULL,
    [VendorId] uniqueidentifier NOT NULL,
    [BuyingEntityId] uniqueidentifier NOT NULL,
    [VersionLabel] nvarchar(max) NOT NULL,
    [Status] int NOT NULL,
    [SubmittedDate] datetime2 NOT NULL,
    [ApprovedDate] datetime2 NULL,
    [RejectionReason] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Catalogues] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Catalogues_BuyingEntities_BuyingEntityId] FOREIGN KEY ([BuyingEntityId]) REFERENCES [BuyingEntities] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Catalogues_Vendors_VendorId] FOREIGN KEY ([VendorId]) REFERENCES [Vendors] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [KycChangeRequests] (
    [Id] uniqueidentifier NOT NULL,
    [VendorId] uniqueidentifier NOT NULL,
    [FieldChanged] nvarchar(max) NOT NULL,
    [OldValue] nvarchar(max) NOT NULL,
    [NewValue] nvarchar(max) NOT NULL,
    [RequestedByUserId] uniqueidentifier NOT NULL,
    [RequestedBy] nvarchar(max) NOT NULL,
    [RequestedDate] datetime2 NOT NULL,
    [Status] int NOT NULL,
    [ApprovedByUserId] uniqueidentifier NULL,
    [ApprovedBy] nvarchar(max) NULL,
    [ActionDate] datetime2 NULL,
    [RejectionReason] nvarchar(max) NULL,
    [SupportingDocumentUrl] nvarchar(max) NULL,
    CONSTRAINT [PK_KycChangeRequests] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_KycChangeRequests_Vendors_VendorId] FOREIGN KEY ([VendorId]) REFERENCES [Vendors] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [RateContracts] (
    [Id] uniqueidentifier NOT NULL,
    [VendorId] uniqueidentifier NOT NULL,
    [BuyingEntityId] uniqueidentifier NOT NULL,
    [ContractNumber] nvarchar(max) NOT NULL,
    [ValidFrom] datetime2 NOT NULL,
    [ValidTo] datetime2 NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_RateContracts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_RateContracts_BuyingEntities_BuyingEntityId] FOREIGN KEY ([BuyingEntityId]) REFERENCES [BuyingEntities] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_RateContracts_Vendors_VendorId] FOREIGN KEY ([VendorId]) REFERENCES [Vendors] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [VendorDedupCandidates] (
    [Id] uniqueidentifier NOT NULL,
    [ClusterId] uniqueidentifier NOT NULL,
    [VendorId] uniqueidentifier NOT NULL,
    [SimilarityScore] decimal(18,2) NOT NULL,
    [MatchedAttributes] nvarchar(max) NULL,
    [IsSource] bit NOT NULL,
    CONSTRAINT [PK_VendorDedupCandidates] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_VendorDedupCandidates_VendorDedupClusters_ClusterId] FOREIGN KEY ([ClusterId]) REFERENCES [VendorDedupClusters] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_VendorDedupCandidates_Vendors_VendorId] FOREIGN KEY ([VendorId]) REFERENCES [Vendors] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [VendorDocuments] (
    [Id] uniqueidentifier NOT NULL,
    [VendorId] uniqueidentifier NOT NULL,
    [DocumentType] nvarchar(max) NOT NULL,
    [FileName] nvarchar(max) NOT NULL,
    [FileUrl] nvarchar(max) NULL,
    [UploadDate] datetime2 NOT NULL,
    [ExpiryDate] datetime2 NULL,
    [IsVerified] bit NOT NULL,
    CONSTRAINT [PK_VendorDocuments] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_VendorDocuments_Vendors_VendorId] FOREIGN KEY ([VendorId]) REFERENCES [Vendors] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [VendorUsers] (
    [Id] uniqueidentifier NOT NULL,
    [VendorId] uniqueidentifier NOT NULL,
    [ContactName] nvarchar(max) NOT NULL,
    [Email] nvarchar(max) NOT NULL,
    [Role] int NOT NULL,
    [Status] int NOT NULL,
    [ScopedEntities] nvarchar(max) NULL,
    [ScopedProperties] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_VendorUsers] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_VendorUsers_Vendors_VendorId] FOREIGN KEY ([VendorId]) REFERENCES [Vendors] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [PurchaseOrders] (
    [Id] uniqueidentifier NOT NULL,
    [PoNumber] nvarchar(450) NOT NULL,
    [VendorId] uniqueidentifier NOT NULL,
    [BuyingEntityId] uniqueidentifier NOT NULL,
    [PropertyId] uniqueidentifier NULL,
    [OrderDate] datetime2 NOT NULL,
    [RequiredByDate] datetime2 NOT NULL,
    [TotalValue] decimal(18,2) NOT NULL,
    [Currency] nvarchar(max) NOT NULL,
    [Status] int NOT NULL,
    [AcknowledgmentReason] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_PurchaseOrders] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_PurchaseOrders_BuyingEntities_BuyingEntityId] FOREIGN KEY ([BuyingEntityId]) REFERENCES [BuyingEntities] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_PurchaseOrders_Properties_PropertyId] FOREIGN KEY ([PropertyId]) REFERENCES [Properties] ([Id]),
    CONSTRAINT [FK_PurchaseOrders_Vendors_VendorId] FOREIGN KEY ([VendorId]) REFERENCES [Vendors] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [CatalogueLines] (
    [Id] uniqueidentifier NOT NULL,
    [CatalogueId] uniqueidentifier NOT NULL,
    [ItemId] uniqueidentifier NULL,
    [ItemCode] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [PackUom] nvarchar(max) NOT NULL,
    [Price] decimal(18,2) NOT NULL,
    [Currency] nvarchar(max) NOT NULL,
    [ValidFrom] datetime2 NOT NULL,
    [ValidTo] datetime2 NOT NULL,
    [TaxClass] nvarchar(max) NOT NULL,
    [Status] int NOT NULL,
    [ContractPrice] decimal(18,2) NULL,
    [DeviationPercent] decimal(18,2) NULL,
    CONSTRAINT [PK_CatalogueLines] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_CatalogueLines_Catalogues_CatalogueId] FOREIGN KEY ([CatalogueId]) REFERENCES [Catalogues] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_CatalogueLines_Items_ItemId] FOREIGN KEY ([ItemId]) REFERENCES [Items] ([Id])
);
GO

CREATE TABLE [RateContractLines] (
    [Id] uniqueidentifier NOT NULL,
    [RateContractId] uniqueidentifier NOT NULL,
    [ItemId] uniqueidentifier NOT NULL,
    [AgreedPrice] decimal(18,2) NOT NULL,
    [Currency] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_RateContractLines] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_RateContractLines_Items_ItemId] FOREIGN KEY ([ItemId]) REFERENCES [Items] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_RateContractLines_RateContracts_RateContractId] FOREIGN KEY ([RateContractId]) REFERENCES [RateContracts] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [DeliveryNotes] (
    [Id] uniqueidentifier NOT NULL,
    [DeliveryNoteNumber] nvarchar(max) NOT NULL,
    [PurchaseOrderId] uniqueidentifier NOT NULL,
    [VendorId] uniqueidentifier NOT NULL,
    [ExpectedDeliveryDate] datetime2 NOT NULL,
    [TimeWindowStart] nvarchar(max) NULL,
    [TimeWindowEnd] nvarchar(max) NULL,
    [Status] int NOT NULL,
    [SupportingDocumentUrl] nvarchar(max) NULL,
    [Notes] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_DeliveryNotes] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_DeliveryNotes_PurchaseOrders_PurchaseOrderId] FOREIGN KEY ([PurchaseOrderId]) REFERENCES [PurchaseOrders] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_DeliveryNotes_Vendors_VendorId] FOREIGN KEY ([VendorId]) REFERENCES [Vendors] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [Invoices] (
    [Id] uniqueidentifier NOT NULL,
    [InvoiceNumber] nvarchar(max) NOT NULL,
    [VendorId] uniqueidentifier NOT NULL,
    [PurchaseOrderId] uniqueidentifier NOT NULL,
    [InvoiceDate] datetime2 NOT NULL,
    [Currency] nvarchar(max) NOT NULL,
    [SubTotal] decimal(18,2) NOT NULL,
    [TaxAmount] decimal(18,2) NOT NULL,
    [TotalAmount] decimal(18,2) NOT NULL,
    [Status] int NOT NULL,
    [MatchStatus] int NOT NULL,
    [MismatchReasons] nvarchar(max) NULL,
    [InvoicePdfUrl] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Invoices] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Invoices_PurchaseOrders_PurchaseOrderId] FOREIGN KEY ([PurchaseOrderId]) REFERENCES [PurchaseOrders] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Invoices_Vendors_VendorId] FOREIGN KEY ([VendorId]) REFERENCES [Vendors] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [PurchaseOrderLines] (
    [Id] uniqueidentifier NOT NULL,
    [PurchaseOrderId] uniqueidentifier NOT NULL,
    [ItemId] uniqueidentifier NULL,
    [ItemDescription] nvarchar(max) NOT NULL,
    [QtyOrdered] decimal(18,2) NOT NULL,
    [QtyAccepted] decimal(18,2) NOT NULL,
    [QtyDelivered] decimal(18,2) NOT NULL,
    [Uom] nvarchar(max) NOT NULL,
    [UnitPrice] decimal(18,2) NOT NULL,
    [LineTotal] decimal(18,2) NOT NULL,
    [AcceptanceReason] nvarchar(max) NULL,
    CONSTRAINT [PK_PurchaseOrderLines] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_PurchaseOrderLines_Items_ItemId] FOREIGN KEY ([ItemId]) REFERENCES [Items] ([Id]),
    CONSTRAINT [FK_PurchaseOrderLines_PurchaseOrders_PurchaseOrderId] FOREIGN KEY ([PurchaseOrderId]) REFERENCES [PurchaseOrders] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [DeliveryNoteLines] (
    [Id] uniqueidentifier NOT NULL,
    [DeliveryNoteId] uniqueidentifier NOT NULL,
    [ItemDescription] nvarchar(max) NOT NULL,
    [QtyInDelivery] decimal(18,2) NOT NULL,
    [BatchLotNumber] nvarchar(max) NULL,
    [ExpiryDate] datetime2 NULL,
    CONSTRAINT [PK_DeliveryNoteLines] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_DeliveryNoteLines_DeliveryNotes_DeliveryNoteId] FOREIGN KEY ([DeliveryNoteId]) REFERENCES [DeliveryNotes] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [InvoiceLines] (
    [Id] uniqueidentifier NOT NULL,
    [InvoiceId] uniqueidentifier NOT NULL,
    [ItemDescription] nvarchar(max) NOT NULL,
    [InvoicedQty] decimal(18,2) NOT NULL,
    [InvoicedUnitPrice] decimal(18,2) NOT NULL,
    [ExpectedQty] decimal(18,2) NOT NULL,
    [ExpectedUnitPrice] decimal(18,2) NOT NULL,
    [LineTotal] decimal(18,2) NOT NULL,
    CONSTRAINT [PK_InvoiceLines] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_InvoiceLines_Invoices_InvoiceId] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Payments] (
    [Id] uniqueidentifier NOT NULL,
    [PaymentReference] nvarchar(max) NOT NULL,
    [VendorId] uniqueidentifier NOT NULL,
    [InvoiceId] uniqueidentifier NOT NULL,
    [Amount] decimal(18,2) NOT NULL,
    [Currency] nvarchar(max) NOT NULL,
    [Status] int NOT NULL,
    [ScheduledDate] datetime2 NULL,
    [PaidDate] datetime2 NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Payments] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Payments_Invoices_InvoiceId] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Payments_Vendors_VendorId] FOREIGN KEY ([VendorId]) REFERENCES [Vendors] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_CatalogueLines_CatalogueId] ON [CatalogueLines] ([CatalogueId]);
GO

CREATE INDEX [IX_CatalogueLines_ItemId] ON [CatalogueLines] ([ItemId]);
GO

CREATE INDEX [IX_Catalogues_BuyingEntityId] ON [Catalogues] ([BuyingEntityId]);
GO

CREATE INDEX [IX_Catalogues_VendorId] ON [Catalogues] ([VendorId]);
GO

CREATE INDEX [IX_DeliveryNoteLines_DeliveryNoteId] ON [DeliveryNoteLines] ([DeliveryNoteId]);
GO

CREATE INDEX [IX_DeliveryNotes_PurchaseOrderId] ON [DeliveryNotes] ([PurchaseOrderId]);
GO

CREATE INDEX [IX_DeliveryNotes_VendorId] ON [DeliveryNotes] ([VendorId]);
GO

CREATE INDEX [IX_InvoiceLines_InvoiceId] ON [InvoiceLines] ([InvoiceId]);
GO

CREATE INDEX [IX_Invoices_PurchaseOrderId] ON [Invoices] ([PurchaseOrderId]);
GO

CREATE INDEX [IX_Invoices_VendorId] ON [Invoices] ([VendorId]);
GO

CREATE INDEX [IX_ItemDedupCandidates_ClusterId] ON [ItemDedupCandidates] ([ClusterId]);
GO

CREATE INDEX [IX_ItemDedupCandidates_ItemId] ON [ItemDedupCandidates] ([ItemId]);
GO

CREATE INDEX [IX_KycChangeRequests_VendorId] ON [KycChangeRequests] ([VendorId]);
GO

CREATE INDEX [IX_Payments_InvoiceId] ON [Payments] ([InvoiceId]);
GO

CREATE INDEX [IX_Payments_VendorId] ON [Payments] ([VendorId]);
GO

CREATE INDEX [IX_Properties_BuyingEntityId] ON [Properties] ([BuyingEntityId]);
GO

CREATE INDEX [IX_PurchaseOrderLines_ItemId] ON [PurchaseOrderLines] ([ItemId]);
GO

CREATE INDEX [IX_PurchaseOrderLines_PurchaseOrderId] ON [PurchaseOrderLines] ([PurchaseOrderId]);
GO

CREATE INDEX [IX_PurchaseOrders_BuyingEntityId] ON [PurchaseOrders] ([BuyingEntityId]);
GO

CREATE UNIQUE INDEX [IX_PurchaseOrders_PoNumber] ON [PurchaseOrders] ([PoNumber]);
GO

CREATE INDEX [IX_PurchaseOrders_PropertyId] ON [PurchaseOrders] ([PropertyId]);
GO

CREATE INDEX [IX_PurchaseOrders_VendorId] ON [PurchaseOrders] ([VendorId]);
GO

CREATE INDEX [IX_RateContractLines_ItemId] ON [RateContractLines] ([ItemId]);
GO

CREATE INDEX [IX_RateContractLines_RateContractId] ON [RateContractLines] ([RateContractId]);
GO

CREATE INDEX [IX_RateContracts_BuyingEntityId] ON [RateContracts] ([BuyingEntityId]);
GO

CREATE INDEX [IX_RateContracts_VendorId] ON [RateContracts] ([VendorId]);
GO

CREATE INDEX [IX_VendorDedupCandidates_ClusterId] ON [VendorDedupCandidates] ([ClusterId]);
GO

CREATE INDEX [IX_VendorDedupCandidates_VendorId] ON [VendorDedupCandidates] ([VendorId]);
GO

CREATE INDEX [IX_VendorDocuments_VendorId] ON [VendorDocuments] ([VendorId]);
GO

CREATE UNIQUE INDEX [IX_Vendors_Gstin] ON [Vendors] ([Gstin]) WHERE [Gstin] IS NOT NULL;
GO

CREATE INDEX [IX_VendorUsers_VendorId] ON [VendorUsers] ([VendorId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260718180937_MakeGstinNullable', N'8.0.6');
GO

COMMIT;
GO

