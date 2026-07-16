-- ══════════════════════════════════════════════════════════════════════
-- Web Prol'IFIC — Seed Data
-- ══════════════════════════════════════════════════════════════════════

USE WebProlific;
GO

-- ─── Buying Entities ──────────────────────────────────────────────
INSERT INTO BuyingEntities (Id, Name, Code, Region) VALUES
('11111111-1111-1111-1111-111111111111', 'Accor — North India', 'ACCI-NI', 'North India'),
('22222222-2222-2222-2222-222222222222', 'Accor — South India', 'ACCI-SI', 'South India'),
('33333333-3333-3333-3333-333333333333', 'Taj Hotels — West', 'TAJ-W', 'West India');

-- ─── Properties ───────────────────────────────────────────────────
INSERT INTO Properties (Id, BuyingEntityId, Name, Code, City) VALUES
('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', '11111111-1111-1111-1111-111111111111', 'Sofitel Delhi', 'SOF-DEL', 'New Delhi'),
('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', '11111111-1111-1111-1111-111111111111', 'Novotel Mumbai', 'NOV-MUM', 'Mumbai'),
('CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', '33333333-3333-3333-3333-333333333333', 'Taj Palace Mumbai', 'TAJ-MUM', 'Mumbai');

-- ─── Items ─────────────────────────────────────────────────────────
INSERT INTO Items (Id, ItemCode, Description, NormalisedDescription, Category, BaseUom, PackSize) VALUES
('DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD', 'FOOD-001', 'Basmati Rice 25kg', 'basmati rice 25 kg', 'Provisions', 'Kg', '25kg'),
('EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE', 'FOOD-002', 'Sunflower Oil 15L', 'sunflower oil 15 l', 'Provisions', 'Litre', '15L'),
('FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', 'FOOD-003', 'Tomato Ketchup 1kg', 'tomato ketchup 1 kg', 'Provisions', 'Kg', '1kg'),
('12345678-1234-1234-1234-123456789012', 'CLEAN-001', 'Floor Cleaner 5L', 'floor cleaner 5 l', 'Housekeeping', 'Litre', '5L'),
('23456789-2345-2345-2345-234567890123', 'LINEN-001', 'Bath Towel White', 'bath towel white', 'Linen', 'Piece', 'Each'),
('34567890-3456-3456-3456-345678901234', 'FOOD-004', 'Paneer Fresh 1kg', 'paneer fresh 1 kg', 'Provisions', 'Kg', '1kg'),
('45678901-4567-4567-8901-456789012345', 'BEV-001', 'Mineral Water 1L Pack of 24', 'mineral water 1 l pack 24', 'Beverages', 'Pack', '24x1L');

-- ─── Vendors ───────────────────────────────────────────────────────
INSERT INTO Vendors (Id, LegalName, TradingName, Gstin, Pan, Address, City, State, ContactEmail, ContactPhone, KycStatus, Status) VALUES
('AA000000-0000-0000-0000-000000000001', 'Mumbai Fresh Foods Pvt Ltd', 'Mumbai Fresh Foods', '27AABCM1234F1Z5', 'AABCM1234F', '123 Andheri Kurla Road, Andheri East', 'Mumbai', 'Maharashtra', 'accounts@mumbaifresh.com', '+91-22-2683-1234', 1, 0),
('AA000000-0000-0000-0000-000000000002', 'Delhi Wholesale Traders', 'DWT Supplies', '07AAACD5678G1Z9', 'AAACD5678G', '45 Karol Bagh, Block B', 'New Delhi', 'Delhi', 'info@dwtsupplies.in', '+91-11-2578-5678', 1, 0),
('AA000000-0000-0000-0000-000000000003', 'Chennai Clean Solutions', 'CleanPro', '33BBBCC9012H1Z3', 'BBBCC9012H', '78 T Nagar Main Road', 'Chennai', 'Tamil Nadu', 'sales@chennaiclean.com', '+91-44-2433-9012', 0, 0),
('AA000000-0000-0000-0000-000000000004', 'Global Linen Exports', 'GLE Linen', '09CCCDE3456I1Z7', 'CCCDE3456I', '234 Sector 62, Noida', 'Noida', 'Uttar Pradesh', 'export@gllinen.com', '+91-120-4567-3456', 2, 0);

-- ─── Rate Contracts ────────────────────────────────────────────────
INSERT INTO RateContracts (Id, VendorId, BuyingEntityId, ContractNumber, ValidFrom, ValidTo) VALUES
('BB000000-0000-0000-0000-000000000001', 'AA000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'RC-2025-ACCI-NI-001', '2025-01-01', '2025-12-31'),
('BB000000-0000-0000-0000-000000000002', 'AA000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'RC-2025-ACCI-NI-002', '2025-01-01', '2025-12-31');

INSERT INTO RateContractLines (Id, RateContractId, ItemId, AgreedPrice, Currency) VALUES
('CC000000-0000-0000-0000-000000000001', 'BB000000-0000-0000-0000-000000000001', 'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD', 2800.00, 'INR'),
('CC000000-0000-0000-0000-000000000002', 'BB000000-0000-0000-0000-000000000001', 'EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE', 1650.00, 'INR'),
('CC000000-0000-0000-0000-000000000003', 'BB000000-0000-0000-0000-000000000001', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', 180.00, 'INR'),
('CC000000-0000-0000-0000-000000000004', 'BB000000-0000-0000-0000-000000000002', '12345678-1234-1234-1234-123456789012', 350.00, 'INR');

-- ─── Catalogues ────────────────────────────────────────────────────
INSERT INTO Catalogues (Id, VendorId, BuyingEntityId, VersionLabel, Status) VALUES
('CA100000-0000-0000-0000-000000000001', 'AA000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'v2', 0),
('CA100000-0000-0000-0000-000000000002', 'AA000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'v1', 1);

INSERT INTO CatalogueLines (Id, CatalogueId, ItemId, ItemCode, Description, PackUom, Price, Currency, ValidFrom, ValidTo, TaxClass, Status, ContractPrice, DeviationPercent) VALUES
('EE000000-0000-0000-0000-000000000001', 'CA100000-0000-0000-0000-000000000001', 'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD', 'FOOD-001', 'Basmati Rice 25kg', '25kg', 2968.00, 'INR', '2025-01-01', '2025-06-30', 'GST-5', 0, 2800.00, 6.00),
('EE000000-0000-0000-0000-000000000002', 'CA100000-0000-0000-0000-000000000001', 'EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE', 'FOOD-002', 'Sunflower Oil 15L', '15L', 1650.00, 'INR', '2025-01-01', '2025-06-30', 'GST-5', 0, 1650.00, 0.00),
('EE000000-0000-0000-0000-000000000003', 'CA100000-0000-0000-0000-000000000001', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', 'FOOD-003', 'Tomato Ketchup 1kg', '1kg', 195.00, 'INR', '2025-01-01', '2025-06-30', 'GST-12', 0, 180.00, 8.33),
('EE000000-0000-0000-0000-000000000004', 'CA100000-0000-0000-0000-000000000002', '12345678-1234-1234-1234-123456789012', 'CLEAN-001', 'Floor Cleaner 5L', '5L', 350.00, 'INR', '2025-01-01', '2025-06-30', 'GST-18', 1, 350.00, 0.00);

-- ─── Purchase Orders ───────────────────────────────────────────────
INSERT INTO PurchaseOrders (Id, PoNumber, VendorId, BuyingEntityId, PropertyId, OrderDate, RequiredByDate, TotalValue, Currency, Status) VALUES
('FF000000-0000-0000-0000-000000000001', 'PO-20250701-001', 'AA000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', '2025-07-01', '2025-07-15', 84000.00, 'INR', 0),
('FF000000-0000-0000-0000-000000000002', 'PO-20250702-002', 'AA000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB', '2025-07-02', '2025-07-18', 49500.00, 'INR', 1),
('FF000000-0000-0000-0000-000000000003', 'PO-20250703-003', 'AA000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', '2025-07-03', '2025-07-20', 28000.00, 'INR', 0),
('FF000000-0000-0000-0000-000000000004', 'PO-20250704-004', 'AA000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCCC', '2025-07-04', '2025-07-22', 126000.00, 'INR', 4);

INSERT INTO PurchaseOrderLines (Id, PurchaseOrderId, ItemId, ItemDescription, QtyOrdered, QtyAccepted, QtyDelivered, Uom, UnitPrice, LineTotal) VALUES
('AB000000-0000-0000-0000-000000000001', 'FF000000-0000-0000-0000-000000000001', 'DDDDDDDD-DDDD-DDDD-DDDD-DDDDDDDDDDDD', 'Basmati Rice 25kg', 30, 0, 0, 'Kg', 2800.00, 84000.00),
('AB000000-0000-0000-0000-000000000002', 'FF000000-0000-0000-0000-000000000002', 'EEEEEEEE-EEEE-EEEE-EEEE-EEEEEEEEEEEE', 'Sunflower Oil 15L', 30, 30, 0, 'Litre', 1650.00, 49500.00),
('AB000000-0000-0000-0000-000000000003', 'FF000000-0000-0000-0000-000000000003', '12345678-1234-1234-1234-123456789012', 'Floor Cleaner 5L', 80, 0, 0, 'Litre', 350.00, 28000.00),
('AB000000-0000-0000-0000-000000000004', 'FF000000-0000-0000-0000-000000000004', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', 'Tomato Ketchup 1kg', 700, 700, 700, 'Kg', 180.00, 126000.00);

-- ─── Users ─────────────────────────────────────────────────────────
INSERT INTO Users (Id, Email, DisplayName, PasswordHash, Role, VendorId, IsInternal, IsActive) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@webprolific.com', 'System Admin', 'admin123', 0, NULL, 1, 1),
('00000000-0000-0000-0000-000000000002', 'buyer@webprolific.com', 'Procurement Buyer', 'buyer123', 1, NULL, 1, 1),
('00000000-0000-0000-0000-000000000003', 'vendor@mumbaifresh.com', 'Rajesh Kumar', 'vendor123', 2, 'AA000000-0000-0000-0000-000000000001', 0, 1);
GO

-- ─── Notifications ─────────────────────────────────────────────────
INSERT INTO Notifications (Id, UserId, Type, Title, Detail, IsRead, CreatedAt) VALUES
('CD000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 0, 'New Purchase Order', 'PO-20250701-001 from Sofitel Delhi - 84,000', 0, GETUTCDATE()),
('CD000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 2, 'Payment Released', 'Payment of 49,500 for PO-20250702-002 is scheduled', 0, DATEADD(HOUR, -2, GETUTCDATE())),
('CD000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 1, 'Invoice Rejected', 'Invoice INV-003 rejected: unit price exceeds PO by 15/kg', 1, DATEADD(DAY, -1, GETUTCDATE())),
('CD000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 3, 'Catalogue Approved', 'Your catalogue v1 for Accor - North India has been approved', 1, DATEADD(DAY, -3, GETUTCDATE()));

-- ─── Sample Dedup Clusters ─────────────────────────────────────────
INSERT INTO VendorDedupClusters (Id, Status) VALUES
('DD100000-0000-0000-0000-000000000001', 0);

INSERT INTO VendorDedupCandidates (Id, ClusterId, VendorId, SimilarityScore, MatchedAttributes, IsSource) VALUES
('DC100000-0000-0000-0000-000000000001', 'DD100000-0000-0000-0000-000000000001', 'AA000000-0000-0000-0000-000000000001', 92.00, '["Name 92%", "Same city"]', 1),
('DC100000-0000-0000-0000-000000000002', 'DD100000-0000-0000-0000-000000000001', 'AA000000-0000-0000-0000-000000000002', 88.00, '["Name 85%", "Address 88%"]', 0);

INSERT INTO ItemDedupClusters (Id, Status, ModelVersion) VALUES
('EF000000-0000-0000-0000-000000000001', 0, 'v2.1');

INSERT INTO ItemDedupCandidates (Id, ClusterId, ItemId, SimilarityScore, MatchedAttributes, IsSource) VALUES
('A0000000-0000-0000-0000-000000000001', 'EF000000-0000-0000-0000-000000000001', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', 95.00, '["Description", "Category", "UOM"]', 1),
('A0000000-0000-0000-0000-000000000002', 'EF000000-0000-0000-0000-000000000001', '34567890-3456-3456-3456-345678901234', 88.00, '["Description", "Category"]', 0);

PRINT 'Seed data inserted successfully!';
GO
