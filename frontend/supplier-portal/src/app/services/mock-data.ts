export interface MockData {
  vendorId: string;
  poToAcknowledge: number;
  invoicesInProgress: number;
  outstandingAmount: number;
  nextPayment: { date: string; amount: number };
}

export const MOCK_VENDOR_ID = "V1000000-0000-0000-0000-000000000001";

export const MOCK_DASHBOARD: MockData = {
  vendorId: MOCK_VENDOR_ID,
  poToAcknowledge: 2,
  invoicesInProgress: 3,
  outstandingAmount: 189500,
  nextPayment: { date: "2025-07-20", amount: 49500 },
};

export const MOCK_PO_LINES = [
  {
    item: "Basmati Rice 25kg",
    qty: 30,
    uom: "Kg",
    unitPrice: 2800,
    lineTotal: 84000,
  },
  {
    item: "Sunflower Oil 15L",
    qty: 30,
    uom: "Litre",
    unitPrice: 1650,
    lineTotal: 49500,
  },
  {
    item: "Floor Cleaner 5L",
    qty: 80,
    uom: "Litre",
    unitPrice: 350,
    lineTotal: 28000,
  },
];

export const MOCK_NOTIFICATIONS = [
  {
    id: "1",
    type: "po" as const,
    title: "New Purchase Order",
    detail: "PO-20250701-001 from Sofitel Delhi — ₹84,000",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: "2",
    type: "payment" as const,
    title: "Payment Released",
    detail: "Payment of ₹49,500 for PO-20250702-002 is scheduled",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: "3",
    type: "rejected" as const,
    title: "Invoice Rejected",
    detail: "Invoice INV-003 rejected: unit price exceeds PO by ₹15/kg",
    time: "1 day ago",
    unread: false,
  },
  {
    id: "4",
    type: "catalogue" as const,
    title: "Catalogue Approved",
    detail: "Your catalogue v1 for Accor — North India has been approved",
    time: "3 days ago",
    unread: false,
  },
];
