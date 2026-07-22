---
name: "Web Prol'IFIC Phase B - Supplier Portal Development"
description: "Comprehensive development skill for the Web Prol'IFIC Phase B project. Covers architecture, data models, API contracts, security requirements, Angular component structure, responsiveness, and implementation guidelines for the supplier extranet, KYC validation, and item/vendor de-duplication."
license: "Proprietary - Commercial-in-confidence (Internal engineering document)"
project_id: "WebProlIFIC-PhaseB"
target_delivery: "Q4 2026"
version: "1.1"
document_date: "26 June 2026"
last_updated: "22 July 2026"
---

# Web Prol'IFIC Phase B Development Specification
## Complete Edition with Angular Component Guidelines

**CRITICAL: This is the SINGLE SOURCE OF TRUTH for all Phase B implementation. Read this document before writing ANY code. Claude will reference this document for every change.**

**Table of Contents:**
1. [Project Overview](#1-project-overview)
2. [Solution Architecture](#2-solution-architecture)
3. [Data Model](#3-data-model)
4. [API Specification](#4-api-specification)
5. [Security & Non-Functional Requirements](#5-security--non-functional-requirements)
6. [Development Workflow & Guidelines](#6-development-workflow--guidelines)
7. [Angular Component Structure & Responsiveness](#7-angular-component-structure--responsiveness) ← **NEW SECTION**
8. [Testing Strategy](#8-testing-strategy)
9. [Requirement Traceability Matrix](#9-requirement-traceability-matrix)
10. [Development Priorities & Timeline](#10-development-priorities--timeline)
11. [Common Gotchas & Anti-Patterns](#11-common-gotchas--anti-patterns)
12. [How to Use This SKILL.md](#12-how-to-use-this-skillmd)
13. [Document Control & Changes](#13-document-control--changes)

---

## 1. Project Overview

### 1.1 Scope & Objectives

**Web Prol'IFIC Phase B** adds three major capabilities to the existing Web Prol'IFIC core (PR→PO→GRN→Journal, rate contracts, three-way matching, India tax compliance):

| Capability | Scope | Requirements |
|---|---|---|
| **Supplier Portal** | Vendor self-service: catalogue publication, PO acknowledgement, delivery notes (ASN), invoice submission, payment visibility | VP-01 to VP-12 |
| **KYC Validation & Vendor De-duplication** | Capture validated identity/compliance; eliminate duplicate vendors; gate portal access on KYC status | KYC-01 to KYC-08 |
| **Item-Master De-duplication (ML)** | Propose duplicate item clusters via embedding + fuzzy matching; human-confirmed merge with history re-pointing | ITM-01 to ITM-06 |

### 1.2 Non-Negotiable Constraints

These design decisions are binding and cannot be changed without re-approval:

- **Layer on the backbone, do not fork it.** No supplier submission posts to the ledger directly. ASNs pre-populate GRNs; invoices are matched but posted only by controlled internal process.
- **Human in the loop.** No automation changes a master record or posts to the ledger without explicit human confirmation.
- **Buyer-scoped catalogues.** A contracted supplier publishes its agreed catalogue to the buying group only — not a public marketplace.
- **Separate supplier identity domain.** Supplier users are on a separate auth realm, never counted against customer concurrent-user licence.
- **Multi-entity isolation throughout.** A supplier sees only contracted entities/properties; zero cross-entity leakage.

### 1.3 Explicit Out of Scope

**Deferred to Phase C/D:**
- Vendor self-service onboarding (Phase C)
- Digital RFQ / e-tendering (Phase C)
- Delivery intimation against rate contracts (Phase C)
- Non-PO / emergency capture with OCR (Phase C)
- Procurement intelligence & vendor rating (Phase C)
- Integrated / scheduled vendor payments (Phase D; Phase B reads payment status only)

---

## 2. Solution Architecture

### 2.1 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Front-end (both surfaces)** | Angular (latest LTS) + TypeScript + Angular Material | Standard SPA framework; shared theming module for brand consistency |
| **Portal BFF & Services** | ASP.NET Core Web API (.NET 8) | Matches existing core stack; consumes open API, not database directly |
| **Item De-dup ML** | Python (FastAPI) + sentence-embedding model | ML ecosystem is Python-first; runs async batch, not on request path |
| **Supplier Auth** | Managed identity provider (separate realm/user pool) | OpenID Connect + Angular integration; JWT bearer in ASP.NET BFF |
| **Database** | SQL Server (new Phase B schema) | Entity Framework Core; existing vendor/item/PO/GRN masters referenced via FK; new entities in own schema |
| **Document Repository** | Reuse existing infrastructure | KYC documents, supplier-submitted documents stored here |

### 2.2 Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   SUPPLIER PORTAL LAYER                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐        ┌────────────────────────┐    │
│  │ Supplier Portal  │        │ Governance Console UI  │    │
│  │   Web App        │        │  (New Angular modules  │    │
│  │  (Angular SPA)   │        │   in existing app)     │    │
│  └────────┬─────────┘        └──────────┬─────────────┘    │
│           │                             │                   │
│           ├─────────────────────────────┤                   │
│           │   OpenID Connect / JWT      │                   │
│           ▼                             ▼                   │
│  ┌─────────────────────────────────────────────────────────┐
│  │    Portal BFF (ASP.NET Core Web API)                    │
│  │  - Entity scope enforcement (SupplierEntityScope)      │
│  │  - Request orchestration                               │
│  │  - Aggregation & transformation                        │
│  └─────────────┬───────────────────────────────────────────┘
│                │
│  ┌─────────────┴───────────────────────────────────────────┐
│  │ Supporting Services (within ASP.NET Core)              │
│  │  - KYC Service                                          │
│  │  - Vendor De-dup Service                               │
│  │  - Notification Service                                │
│  └─────────────┬───────────────────────────────────────────┘
│                │
│                ├─────────────────────┐
│                │                     │
│                ▼                     ▼
│  ┌──────────────────────┐  ┌───────────────────────┐
│  │ Integration Gateway  │  │ Item De-dup Service   │
│  │ (Adapter over core   │  │ (Python/FastAPI)      │
│  │  open API)           │  │ - Normalisation       │
│  │ - Read POs/GRNs      │  │ - Embedding scoring   │
│  │ - Read payables      │  │ - Clustering          │
│  │ - Write pending      │  │ (Async batch only)    │
│  │   actions            │  └───────────────────────┘
│  └──────────────────────┘
│
│  ┌────────────────────────────────────────────────────┐
│  │        CORE SYSTEM OF RECORD (Phase A+)            │
│  │  - Vendor Master (extended with KYC, de-dup refs) │
│  │  - Item Master (extended with de-dup refs)        │
│  │  - PO / GRN / Payable (unchanged)                  │
│  │  - Rate Contracts, Three-way Match (unchanged)    │
│  │  - Open API (for Gateway integration)              │
│  └────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

**Integration Boundary (CRITICAL):**
The Integration Gateway is the **only** path between supplier-facing systems and the ledger. It:
- Exposes **read endpoints** (open POs for vendor, GRNs, payable status)
- Exposes **write endpoints** that create **pending internal actions** (catalogue-for-approval, PO ack, pending delivery note, pending invoice)
- **Never posts automatically to the ledger;** everything lands in an internal queue for controlled action

---

## 3. Data Model

### 3.1 Supplier Portal & Identity

All entities new in Phase B; existing Vendor/Item/PO/GRN/Payable referenced via foreign keys.

#### SupplierUser
```
id (PK)
vendor_id (FK Vendor Master) — must be KYC-validated
email (unique per vendor_id)
display_name
role ENUM: 'catalogue' | 'orders' | 'finance' | 'admin'
status ENUM: 'invited' | 'active' | 'suspended'
auth_subject (IdP subject id, for linking to auth realm)
created_at
last_login_at
```

#### SupplierEntityScope (VP-02: Multi-entity isolation)
```
id (PK)
supplier_user_id (FK SupplierUser)
buying_entity_id (FK Entity Master)
property_id (FK Property Master, nullable) — null = entity-wide access
access_level ENUM: 'read_only' | 'transact'
created_at
```
**Usage:** Every query from the Portal BFF filters by user's SupplierEntityScope rows. No query returns cross-entity data.

#### SupplierCatalogue
```
id (PK)
vendor_id (FK Vendor Master)
buying_entity_id (FK Entity Master)
version (incremented per edit cycle)
status ENUM: 'draft' | 'submitted' | 'approved' | 'rejected' | 'superseded'
submitted_at (timestamp when first submitted)
approved_by (FK internal user)
approved_at
rejected_reason (if rejected)
```

#### SupplierCatalogueLine
```
id (PK)
catalogue_id (FK SupplierCatalogue)
item_code (FK Item Master, nullable until mapped)
description
pack_uom
price (decimal 12,2)
currency (ISO 4217 code)
validity_from (date)
validity_to (date)
tax_class (reference to tax master)
contract_deviation_flag BOOLEAN — set if price deviates > tolerance from rate contract
deviation_pct DECIMAL — actual variance %
line_created_at
```

#### POAcknowledgement (VP-05)
```
id (PK)
po_id (FK PO Master)
vendor_id (FK Vendor Master)
status ENUM: 'acknowledged' | 'partially_accepted' | 'unable_to_supply'
overall_reason (if unable to supply)
acknowledged_at (timestamp)
line_responses JSON ARRAY:
  [
    {
      po_line_id: FK,
      qty_accepted: decimal,
      reason: text (if partial/unable)
    }
  ]
```

#### DeliveryNote (ASN) (VP-06, VP-07)
```
id (PK)
po_id (FK PO Master)
vendor_id (FK Vendor Master)
status ENUM: 'submitted' | 'received' | 'cancelled'
expected_delivery_date (date)
actual_delivery_date (nullable)
lines JSON ARRAY:
  [
    {
      item_code: FK Item Master,
      po_line_id: FK PO Line,
      qty_delivered: decimal,
      batch_no: text,
      expiry_date: date (nullable)
    }
  ]
created_at (in supplier portal)
received_at (when GRN is created against it)
```
**Lifecycle:** ASN submitted by supplier → Integration Gateway creates pending receipt → Portal app shows to stores → Stores create GRN against pending receipt. **GRN remains internal only.**

#### PortalInvoice (VP-08: Invoice matching)
```
id (PK)
po_id (FK PO Master)
grn_id (FK GRN Master, nullable) — populated at match time
vendor_id (FK Vendor Master)
invoice_no (text)
invoice_date (date)
invoice_currency (ISO 4217)
subtotal (decimal 12,2)
tax_amount (decimal 12,2)
total_amount (decimal 12,2)
match_status ENUM: 'matched' | 'mismatch' | 'pending'
submitted_at (timestamp)
lines JSON ARRAY:
  [
    {
      item_code: FK Item Master,
      description: text,
      qty_invoiced: decimal,
      unit_price: decimal,
      line_amount: decimal,
      po_line_id: FK PO Line (nullable if no PO)
    }
  ]
mismatch_reasons JSON ARRAY (if match_status='mismatch'):
  [
    {
      type: 'qty_variance' | 'price_variance' | 'tax_variance' | 'extra_line' | 'missing_line',
      po_value: value,
      invoice_value: value,
      variance_pct: decimal
    }
  ]
```

**Matching Logic:**
1. Derive expected invoice from PO + matched GRN
2. Compare line-by-line: quantity, price, tax
3. If all within tolerance (typically 1-2%): `match_status = 'matched'`
4. Else: `match_status = 'mismatch'`, capture reasons, **do not post** — surface to AP queue

#### Notification (VP-10)
```
id (PK)
recipient_supplier_user_id (FK SupplierUser)
type ENUM: 'new_po' | 'po_acknowledged' | 'document_rejected' | 'payment_released' | 'catalogue_decision' | 'invoice_action_required'
payload JSON — flexible schema per type
channel ENUM: 'in_portal' | 'email'
read_at (nullable)
created_at
```

---

### 3.2 KYC & Vendor De-duplication

#### VendorKYCProfile (KYC-01, KYC-04)
```
id (PK)
vendor_id (FK Vendor Master, 1:1)
gstin (15 chars, validated)
pan (10 chars, validated)
msme_status ENUM: 'not_msme' | 'micro' | 'small' | 'medium' | 'unknown'
udyam_no (nullable, for registered Udyam)
registered_legal_name (text)
registered_address_line1, _line2, _city, _state, _postal_code, _country
kyc_status ENUM: 'incomplete' | 'validated' | 'expired' | 'blocked'
  — incomplete: mandatory fields or docs missing
  — validated: structural + optional external verification passed
  — expired: doc or verification lapsed
  — blocked: governance-imposed block
current_version (incremented with every maker-checker-approved change)
last_validated_at (timestamp of most recent successful validation)
expires_at (calculated from document expiry dates; triggers status transition to 'expired')
blocked_reason (if kyc_status='blocked')
blocked_by (FK User, if blocked)
```

#### VendorBankDetail (KYC-01, KYC-05)
```
id (PK)
vendor_id (FK Vendor Master)
account_name (text)
account_no (text)
ifsc (11 chars, validated)
is_primary BOOLEAN — only one per vendor
status ENUM: 'pending' | 'approved'
  — pending: awaiting maker-checker approval before taking effect for payment
  — approved: live for payment
version (incremented; all versions retained)
created_at
approved_at (nullable)
approved_by (FK User, nullable)
```

#### KYCDocument (KYC-01)
```
id (PK)
vendor_id (FK Vendor Master)
doc_type ENUM: 'gst_certificate' | 'pan_card' | 'msme_certificate' | 'udyam_certificate' | 'cancelled_cheque' | 'address_proof' | 'other'
file_ref (FK Document Repository)
uploaded_at (timestamp)
expiry_date (nullable)
status ENUM: 'active' | 'superseded'
```

#### KYCVerificationResult (KYC-03: External verification)
```
id (PK)
vendor_id (FK Vendor Master)
field ENUM: 'gstin' | 'pan'
method ENUM: 'structural' | 'external_api'
result ENUM: 'pass' | 'fail' | 'unable_to_verify'
authority_reference (text) — API response reference if method='external_api'
verified_at (timestamp)
expires_at (nullable) — some verifications expire
```

#### KYCChangeRequest (KYC-05: Maker-checker)
```
id (PK)
vendor_id (FK Vendor Master)
field ENUM: 'bank_account' | 'gstin' | 'pan' | 'legal_name' | 'address'
old_value (JSON, captures before state)
new_value (JSON, captures requested state)
maker (FK User) — who requested
checker (FK User, nullable) — who approved/rejected
status ENUM: 'pending' | 'approved' | 'rejected'
rejection_reason (nullable)
requested_at (timestamp)
decided_at (nullable)
```
**Critical:** Changes do not take effect until checker approves. Bank account changes move vendor to payment-blocked state until approval.

#### VendorDuplicateCandidateSet (KYC-06, KYC-08)
```
id (PK)
source_vendor_id (FK Vendor Master)
detected_at (timestamp)
status ENUM: 'open' | 'resolved' (merged or dismissed)
match_type ENUM: 'exact_gstin' | 'exact_bank_account' | 'exact_pan' | 'fuzzy_name_address'
confidence_score DECIMAL (0-1)
candidates JSON ARRAY:
  [
    {
      vendor_id: FK,
      matched_attributes: ['gstin', 'bank_account', ...],
      score: decimal,
      match_reason: text
    }
  ]
hard_block BOOLEAN — set to true if exact GSTIN or exact bank-on-different-name (KYC-08)
```

#### VendorMergeAudit (KYC-07)
```
id (PK)
surviving_vendor_id (FK Vendor Master)
merged_vendor_ids ARRAY (JSON) — all IDs merged into survivor
repointed_documents JSON:
  {
    po_count: int,
    grn_count: int,
    invoice_count: int,
    rate_contract_count: int,
    catalogue_mapping_count: int
  }
actor (FK User) — who approved merge
merge_reason (text)
merged_at (timestamp)
```

---

### 3.3 Item De-duplication

#### ItemDuplicateCluster (ITM-01, ITM-02)
```
id (PK)
status ENUM: 'open' | 'merged' | 'dismissed'
similarity_score DECIMAL (0-1) — composite embedding + attribute match
member_item_codes ARRAY (JSON) — all item_codes in cluster
  [
    {
      item_code: FK Item Master,
      category: text,
      base_uom: text,
      description: text
    }
  ]
matched_attributes ARRAY (JSON):
  [
    {
      attribute: 'description' | 'pack_size' | 'key_spec',
      similarity: decimal
    }
  ]
proposed_at (timestamp)
model_version (text) — version of ML model that generated this; enables reproducibility
```

#### ItemMergeAudit (ITM-03, ITM-04)
```
id (PK)
surviving_item_code (FK Item Master)
merged_item_codes ARRAY (JSON) — all codes merged into survivor
repointed JSON:
  {
    grn_lines_updated: int,
    rate_contract_lines_updated: int,
    catalogue_mappings_updated: int,
    purchase_order_lines_updated: int
  }
override_reason (text, nullable) — if merge crossed UOM/category (ITM-05)
actor (FK User)
merged_at (timestamp)
```

#### ItemNormalisationCache (ITM-02)
```
id (PK)
item_code (FK Item Master)
normalised_description (text) — lower-case, expanded abbreviations, canonical units
canonical_uom (text) — e.g. 'kg', 'ltr', 'pcs'
canonical_pack_size (decimal)
embedding_ref (text) — reference to embedding vector (stored externally in ML service)
refreshed_at (timestamp)
model_version (text) — normalisation dictionary version
```

---

## 4. API Specification

### 4.1 Supplier Portal (Portal BFF)

**Authentication:** OpenID Connect (separate supplier realm); JWT bearer token in Authorization header.
**Entity Scoping:** BFF filters all responses by user's SupplierEntityScope; any cross-entity request returns 403 Forbidden.
**Base URL:** `https://supplier-portal.prologicfirst.com/api` (separate domain from internal app)

#### Authentication & Session
```
POST /auth/login
  Request: { email: string, password: string }
  Response: { access_token: JWT, refresh_token: JWT, expires_in: int }
  Status: 200 | 401 Unauthorized | 403 Account Suspended

POST /auth/mfa/initiate
  Request: { email: string }
  Response: { mfa_challenge_id: string, delivery_method: 'sms'|'email' }

POST /auth/mfa/verify
  Request: { mfa_challenge_id: string, code: string }
  Response: { access_token: JWT, refresh_token: JWT }

POST /auth/password-reset
  Request: { email: string }
  Response: { reset_token: string } (sent via email link)

POST /auth/logout
  Response: 204 No Content
```

#### Catalogue Management (VP-03, VP-04)
```
GET /catalogues?entity_id={id}
  Response: {
    data: [
      {
        id, vendor_id, buying_entity_id, version,
        status: 'draft'|'submitted'|'approved'|'rejected'|'superseded',
        line_count, total_lines_value,
        submitted_at, approved_at, approval_reason
      }
    ]
  }
  Status: 200

GET /catalogues/{id}
  Response: {
    id, vendor_id, version, status, created_at, updated_at,
    lines: [
      { id, item_code, description, pack_uom, price, currency,
        validity_from, validity_to, tax_class,
        contract_deviation_flag, deviation_pct }
    ],
    approval_decision: { approved_by, approved_at, reason } (if approved/rejected)
  }

POST /catalogues
  Request: { buying_entity_id, lines: [{ item_code?, description, pack_uom, price, currency, validity_from, validity_to, tax_class }] }
  Response: { id, status: 'draft', version: 1 }
  Status: 201 Created | 403 KYC blocked (if vendor KYC status != 'validated')

PUT /catalogues/{id}/lines/{line_id}
  Request: { description, pack_uom, price, currency, validity_from, validity_to, tax_class }
  Response: { updated_at }
  Status: 200 | 409 Conflict (if catalogue already approved)

POST /catalogues/{id}/submit
  Request: { /* no body */ }
  Response: { status: 'submitted', submitted_at, approval_queue_id }
  Status: 200 | 409 Conflict (if already submitted/approved)
  Side-effect: Creates internal Catalogue Approval task; reconciles against vendor rate contracts; sets deviation flags

DELETE /catalogues/{id}/lines/{line_id}
  Response: 204 No Content
  Status: 204 | 409 Conflict (if not in draft status)
```

#### PO Inbox & Acknowledgement (VP-05)
```
GET /pos?entity_id={id}&status={acknowledged|pending}
  Response: {
    data: [
      {
        id: po_id, po_number, order_date, delivery_date,
        vendor_id, entity_id, property_id,
        total_value, currency,
        status: 'pending'|'acknowledged'|'partially_accepted'|'unable_to_supply',
        line_count, lines_responded: int,
        received_at: timestamp (of acknowledgement)
      }
    ]
  }

GET /pos/{po_id}
  Response: {
    id, po_number, order_date, delivery_date,
    lines: [
      {
        id: line_id, item_code, description, qty_ordered, uom,
        unit_price, line_amount, tax,
        ack_status: 'pending'|'acknowledged'|'partial'|'unable',
        ack_qty: decimal (if partial),
        ack_reason: text
      }
    ],
    ack_status: 'pending'|'acknowledged'|'partially_accepted'|'unable_to_supply',
    ack_created_at: timestamp
  }

POST /pos/{po_id}/acknowledge
  Request: {
    status: 'acknowledged'|'partially_accepted'|'unable_to_supply',
    reason: text (if unable or partial),
    line_responses: [
      { po_line_id, qty_accepted?: decimal, reason?: text }
    ]
  }
  Response: { ack_id, po_id, status, acknowledged_at }
  Status: 201 Created | 403 KYC blocked | 409 Already acknowledged
  Side-effect: Integration Gateway creates POAcknowledgement record
```

#### Delivery Notes (ASN) (VP-06, VP-07)
```
POST /pos/{po_id}/delivery-notes
  Request: {
    expected_delivery_date: date,
    lines: [
      {
        po_line_id, item_code, qty_delivered: decimal,
        batch_no: text, expiry_date?: date
      }
    ]
  }
  Response: { asn_id, po_id, status: 'submitted', created_at }
  Status: 201 Created | 403 KYC blocked | 404 PO not found
  Side-effect: Integration Gateway creates DeliveryNote as 'submitted'; portal app shows to stores as pending receipt for GRN pre-population

GET /pos/{po_id}/delivery-notes
  Response: {
    data: [
      {
        id, po_id, status: 'submitted'|'received'|'cancelled',
        expected_delivery_date, actual_delivery_date,
        line_count, created_at, grn_id: FK (if received)
      }
    ]
  }
```

#### Invoice Submission & Matching (VP-08)
```
POST /invoices
  Request: {
    po_id, grn_id: null (optional, for non-PO invoices),
    invoice_no: string, invoice_date: date,
    currency: ISO4217, lines: [
      { item_code, description, qty, unit_price, line_amount, tax }
    ]
  }
  Response: {
    invoice_id, po_id, status: 'matched'|'mismatch'|'pending',
    match_details: {
      expected_total, invoice_total, variance_pct,
      mismatches: [
        { type: 'qty_variance'|'price_variance'|..., po_value, invoice_value, variance_pct }
      ]
    },
    submitted_at
  }
  Status: 201 Created | 403 KYC blocked | 409 Duplicate invoice_no
  Side-effect: Integration Gateway creates PortalInvoice; runs matching logic; if mismatch, surfaces to AP queue

GET /invoices?po_id={po_id}&status={matched|mismatch|pending}
  Response: {
    data: [
      {
        id, po_id, invoice_no, invoice_date,
        status, total_value, currency,
        mismatches: int (if status='mismatch'),
        submitted_at
      }
    ]
  }

GET /invoices/{invoice_id}
  Response: {
    id, po_id, invoice_no, invoice_date, currency,
    status, lines: [...], match_details: { ... },
    submitted_at
  }
```

#### Account & Statement View (VP-09)
```
GET /account/statement?entity_id={id}&month_from={YYYY-MM}&month_to={YYYY-MM}
  Response: {
    vendor_name, vendor_id, entity_name,
    opening_balance, transactions: [
      { date, invoice_id, po_id, description, debit, credit, running_balance }
    ],
    summary: {
      total_invoices_outstanding, total_value_outstanding,
      invoices_matched, invoices_disputed,
      payments_scheduled: [ { date, amount, po_ids: [...] } ],
      payments_completed: [ { date, amount, po_ids: [...], reference } ]
    }
  }
  — Reads from core Payable module; no changes to ledger
```

#### Notifications (VP-10)
```
GET /notifications?unread={true|false}
  Response: {
    data: [
      {
        id, type: 'new_po'|'document_rejected'|'payment_released'|'catalogue_decision',
        title, message, payload: { ...type-specific... },
        created_at, read_at: null
      }
    ]
  }

POST /notifications/{id}/read
  Response: { read_at: timestamp }
  Status: 200
```

---

### 4.2 Internal Governance Console (New Screens in Existing App)

**Base URL:** Internal domain; existing auth & RBAC apply.

#### KYC Review & Management (KYC-01–05)
```
GET /internal/kyc/queue?status={incomplete|expired}&priority=high
  Response: {
    data: [
      {
        vendor_id, vendor_name, kyc_status,
        expired_docs: [...], days_since_last_validation,
        portal_access_blocked: boolean,
        pending_changes: int
      }
    ]
  }

GET /internal/vendors/{vendor_id}/kyc
  Response: {
    vendor_id, vendor_name,
    kyc_profile: {
      gstin, pan, msme_status, udyam_no,
      legal_name, address,
      kyc_status, last_validated_at, expires_at,
      documents: [
        { doc_type, file_ref, uploaded_at, expiry_date, status }
      ],
      verification_results: [
        { field, method, result, verified_at, expires_at }
      ]
    },
    bank_accounts: [
      { id, account_name, account_no, ifsc, is_primary, status }
    ],
    pending_changes: [
      { field, old_value, new_value, status, maker, requested_at }
    ]
  }

PUT /internal/vendors/{vendor_id}/kyc
  Request: {
    gstin?: string, pan?: string, legal_name?: string,
    bank_account?: { account_name, account_no, ifsc, is_primary }
  }
  Response: { version, change_request_id (if critical field), status }
  Status: 200 | 201 (if change request created)
  Side-effect: Critical changes (bank, GSTIN, legal name) → KYCChangeRequest with maker = current user

POST /internal/kyc/change-requests/{change_request_id}/decide
  Request: { decision: 'approve'|'reject', reason?: string }
  Response: { status, decided_at, decided_by }
  Status: 200
  Side-effect: If approve, value takes effect; if bank change, unblock payment scheduling
```

#### Vendor De-duplication Review (KYC-06–08)
```
GET /internal/vendors/{vendor_id}/duplicates
  Response: {
    vendor_id, vendor_name,
    candidate_sets: [
      {
        id: set_id, status: 'open'|'resolved',
        hard_block: boolean,
        match_type: 'exact_gstin'|'exact_bank'|...,
        candidates: [
          {
            vendor_id, vendor_name, gstin, pan, legal_name,
            matched_attributes: [...],
            score, match_reason
          }
        ],
        detected_at
      }
    ]
  }

POST /internal/vendors/merge
  Request: {
    surviving_vendor_id, merged_vendor_ids: [id1, id2, ...],
    reason: string
  }
  Response: { merge_audit_id, surviving_vendor_id, merged_count, repointed_count }
  Status: 201 Created
  Side-effect: Integration Gateway calls core merge transaction; re-points POs, GRNs, invoices, rate contracts; logs VendorMergeAudit; irreversible at ledger level
```

#### Item De-duplication Review (ITM-01–06)
```
GET /internal/items/clusters?status={open|merged|dismissed}
  Response: {
    data: [
      {
        id, status, similarity_score,
        member_items: [
          { item_code, category, uom, description }
        ],
        matched_attributes: [...],
        proposed_at, model_version
      }
    ]
  }

GET /internal/items/clusters/{cluster_id}
  Response: {
    id, status, similarity_score,
    member_items: [
      {
        item_code, category, uom, pack_size, description,
        grn_line_count, rate_contract_count, catalogue_mapping_count
      }
    ],
    matched_attributes, proposed_at, model_version
  }

POST /internal/items/merge
  Request: {
    cluster_id, surviving_item_code,
    override_reason?: string (required if cross-UOM/category merge)
  }
  Response: { merge_audit_id, surviving_item_code, repointed_count }
  Status: 201 Created
  Side-effect: Integration Gateway executes merge; re-points GRNs, rate-contract lines, catalogue mappings; logs ItemMergeAudit

POST /internal/items/clusters/{cluster_id}/dismiss
  Request: { reason: string }
  Response: { status: 'dismissed', dismissed_at }
  Status: 200
```

#### Catalogue Approval (VP-03, VP-04)
```
GET /internal/catalogues/approvals?status={submitted|pending}
  Response: {
    data: [
      {
        catalogue_id, vendor_id, vendor_name, version,
        buying_entity_id, submitted_at,
        line_count, total_value, currency,
        deviations: int (lines with contract_deviation_flag),
        deviation_summary: { item_code, contracted_price, submitted_price, variance_pct }
      }
    ]
  }

GET /internal/catalogues/{catalogue_id}/approval
  Response: {
    catalogue_id, vendor_id, version,
    lines: [
      {
        item_code, description, pack_uom, price, currency,
        validity_from, validity_to, tax_class,
        contract_deviation_flag, deviation_pct,
        rate_contract_price: decimal (if deviated),
        deviation_reason: text (optional from vendor)
      }
    ],
    submitted_at
  }

POST /internal/catalogues/{catalogue_id}/decision
  Request: {
    decision: 'approve'|'reject'|'request_revision',
    reason?: string,
    approved_by: FK User
  }
  Response: { catalogue_id, status, decided_at }
  Status: 200
  Side-effect: If approved, status → 'approved'; all lines live for PO matching. If rejected, supplier notified.
```

#### Submission Review & Receipts (VP-06, VP-07, VP-08)
```
GET /internal/submissions/receipts?status={submitted|received}
  Response: {
    data: [
      {
        asn_id, po_id, po_number, vendor_id, vendor_name,
        expected_delivery_date, actual_delivery_date,
        line_count, lines: [
          { item_code, po_qty, delivered_qty, batch_no, expiry_date }
        ],
        created_at, grn_id: null (until GRN created against it)
      }
    ]
  }

GET /internal/submissions/invoices?status={matched|mismatch|pending}
  Response: {
    data: [
      {
        invoice_id, po_id, po_number, vendor_id, vendor_name,
        invoice_no, invoice_date, total_value, currency,
        status, mismatches: [
          { type, po_value, invoice_value, variance_pct }
        ],
        submitted_at, action_required: boolean
      }
    ]
  }
```

---

### 4.3 Integration Gateway (Adapter Over Core Open API)

**Base URL:** Internal domain; called by Portal BFF and services.
**Purpose:** Provide controlled read/write boundary between supplier-facing systems and the ledger.

#### Read Endpoints (Consume Core Open API)
```
GET /gw/pos?vendor_id={id}&entity_id={id}&status={open|partially_received|received}
  Response: [
    { id: po_id, po_number, order_date, vendor_id, entity_id,
      lines: [ { id: line_id, item_code, description, qty, uom, price, tax, line_amount } ],
      total, currency, acknowledgement_status: 'pending'|'acknowledged'|...,
      grn_status: 'none'|'partial'|'complete' }
  ]

GET /gw/grns?po_id={id}
  Response: [
    { id: grn_id, po_id, grn_date, lines: [...], total }
  ]

GET /gw/payables?vendor_id={id}&entity_id={id}
  Response: [
    { id: payable_id, invoice_id, invoice_no, po_id, vendor_id, entity_id,
      amount, currency, maturity_date, payment_status: 'open'|'scheduled'|'paid',
      payment_date: null, payment_reference: null }
  ]
```

#### Write Endpoints (Create Pending Internal Actions)
```
POST /gw/pending/delivery-note
  Request: {
    po_id, vendor_id, expected_delivery_date,
    lines: [ { po_line_id, item_code, qty, batch_no, expiry_date } ]
  }
  Response: { asn_id, status: 'pending_receipt' }
  Side-effect: Creates DeliveryNote in 'submitted' state; appears in Portal app as pending receipt for GRN pre-pop; **never creates GRN automatically**

POST /gw/pending/invoice
  Request: {
    po_id, vendor_id, invoice_no, invoice_date, currency,
    lines: [ { item_code, description, qty, unit_price, tax, line_amount } ],
    subtotal, tax_amount, total
  }
  Response: {
    invoice_id, status: 'matched'|'mismatch',
    match_details: { expected_total, variance_pct, mismatches: [...] }
  }
  Side-effect: Creates PortalInvoice; runs matching; surfaces to AP queue if mismatch; **never posts to ledger automatically**
```

#### Merge Orchestration (Call Core Merge Transactions)
```
POST /gw/vendor-merge
  Request: {
    surviving_vendor_id, merged_vendor_ids: [...],
    repoint_mode: 'transactional',
    actor: FK User, reason: string
  }
  Response: { merge_audit_id, repointed: { po_count, grn_count, invoice_count, rate_contract_count } }
  Status: 201 | 409 Conflict (if open transactions on merged vendor)
  Side-effect: **Transactional merge** via core API; re-points all POs, GRNs, invoices, rate contracts to surviving vendor; logs VendorMergeAudit; irreversible

POST /gw/item-merge
  Request: {
    surviving_item_code, merged_item_codes: [...],
    repoint_mode: 'transactional',
    cross_uom_override?: boolean,
    actor: FK User, reason: string
  }
  Response: { merge_audit_id, repointed: { grn_count, rate_contract_count, catalogue_mapping_count } }
  Status: 201 | 409 Conflict (if override=false and cross-UOM detected)
  Side-effect: **Transactional merge** via core API; re-points GRNs, rate-contract lines, catalogue mappings; logs ItemMergeAudit
```

---

## 5. Security & Non-Functional Requirements

### 5.1 Multi-Entity Isolation (Critical)

**Requirement:** A supplier sees ONLY contracted entities/properties; zero cross-entity leakage.

**Implementation:**
- Every SupplierUser has one or more SupplierEntityScope rows (entity_id + optional property_id).
- Portal BFF enforces scope on **every** query: filter WHERE buying_entity_id IN (user's scopes).
- Data layer (EF Core) applies this filter automatically via global query filters.
- **Automated tests:** For each endpoint, assert that entity_A's user cannot read/modify entity_B data.

### 5.2 Authentication & Identity

| Domain | Realm | Users | Licensing |
|---|---|---|---|
| **Supplier Portal** | Separate realm (own user pool / IdP) | SupplierUser only; email + password + MFA | Do NOT count against customer concurrent-user licence |
| **Governance Console** | Internal domain; existing SSO | Internal users + RBAC | Existing licensing model unchanged |

**Supplier Auth Implementation:**
- Managed identity provider configured as separate realm (e.g., Auth0 tenant, Cognito user pool, Entra ID B2B realm).
- OpenID Connect integration in Angular Portal.
- JWT bearer token in BFF.
- Token includes scoped entity IDs and roles as claims.
- **Critical:** Licence audit must verify that supplier sessions never decrement customer concurrent-user count.

### 5.3 Authorization & Role-Based Access

**Supplier Portal Roles:**
- `catalogue` — publish/edit catalogues
- `orders` — acknowledge POs, submit ASNs
- `finance` — submit invoices, view statements
- `admin` — manage supplier users (invite, suspend, role assignments)

**Governance Console Roles:**
- `vendor_governance` — KYC review, make/check changes
- `item_governance` — item de-dup review, merge decisions
- `buyer` / `property_manager` — approve catalogues, review ASNs/invoices
- `admin` — provision suppliers, configure integrations

**Enforcement:** Every endpoint enforces role check server-side; no client-side role gate is a security control.

### 5.4 Data Validation & Sanitization

| Field | Validation |
|---|---|
| **GSTIN (15 chars)** | Regex `\d{2}[A-Z0-9]{13}` + mod-36 check digit; reject on mismatch |
| **PAN (10 chars)** | Regex `[A-Z]{5}\d{4}[A-Z]`; GSTIN characters 3–12 must equal PAN |
| **IFSC (11 chars)** | Regex `[A-Z]{4}0[A-Z0-9]{6}`; validate against RBI IFSC registry (cached) |
| **Email** | Standard RFC 5322; verify ownership via challenge link |
| **Price fields** | Decimal(12,2); no negative; tolerance for variance checks is 1–2% (configurable) |
| **Quantity fields** | Positive decimal; reject zero or negative |
| **Dates** | ISO 8601; validity_from ≤ validity_to; expiry_date ≥ today + 30 days (for documents) |
| **Invoice number** | Alphanumeric; unique per vendor per entity per month (or custom logic) |

**Server-side validation is mandatory;** client-side validation is UX only.

### 5.5 Audit & Traceability

Every significant action is logged to an append-only audit table:

```
AuditLog:
  id (PK)
  entity_type ENUM: 'SupplierCatalogue' | 'SupplierUser' | 'KYCProfile' | 'VendorMerge' | ...
  entity_id (FK, identifies the affected record)
  action ENUM: 'created' | 'updated' | 'approved' | 'rejected' | 'merged' | ...
  actor (FK User) — who made the change
  before_state JSON — state before change
  after_state JSON — state after change
  timestamp
  ip_address (if supplier)
  change_reason (if required)
```

**Audited Actions:**
- Any KYC field capture, validation, or change request
- Vendor merge (surviving, merged, re-pointed documents)
- Catalogue submit, approval, rejection
- PO acknowledgement, ASN submit, invoice submit
- Item merge, duplicate cluster dismissal
- Maker-checker approval/rejection
- Supplier user invite, suspend, role change

### 5.6 Data Residency

- New Phase B entities provisioned in the same SQL Server instance as Phase A (India-hosted for India customers).
- Backups follow existing residency policy.
- Document Repository access respects residency constraints.

### 5.7 Performance Targets

| Surface | Operation | Target Latency | Notes |
|---|---|---|---|
| Supplier Portal | Login | < 2 sec | JWT issuance |
| Supplier Portal | List POs | < 1 sec | 50 POs, scoped |
| Supplier Portal | Submit catalogue | < 2 sec | validation + deviation check |
| Supplier Portal | Submit invoice | < 3 sec | matching logic on request path |
| Governance Console | Load KYC queue | < 2 sec | 100 vendors |
| Governance Console | Load de-dup clusters | < 2 sec | 50 clusters |
| Item De-dup Service | Batch clustering | Off request path | < 10 min for 5k items |

**Caching Strategy:**
- Rate contracts cached in Portal BFF (TTL 1 hour).
- Item normalisation cache (ItemNormalisationCache) refreshed on-demand or batch.
- Vendor/item master read-only in Portal context; no write-through caching.

### 5.8 Human-in-the-Loop Guarantee

**No automation posts to the ledger or changes a master without explicit human confirmation.** Violations are critical bugs:

- Supplier submits invoice → Invoice created as 'pending' in PortalInvoice; AP team manually posts.
- Supplier submits ASN → DeliveryNote created as 'submitted'; store/goods-in team manually creates GRN against it.
- ML proposes duplicate cluster → Cluster marked 'open'; governance user manually confirms merge.
- Maker proposes KYC change → ChangeRequest marked 'pending'; checker manually approves.

### 5.9 External Verification (KYC-03)

**If GSTIN/PAN verification API is contracted:**
- Call on capture; store result + authority reference + timestamp in KYCVerificationResult.
- Set status to 'validated' if API returns success.
- Poll for expiry and transition status to 'expired' when result lapses.

**If API is NOT contracted:**
- Perform structural validation (format, check digit, cross-field rules).
- Require manual confirmation by a checker (maker-checker flow).
- Governance user clicks "I have verified this GSTIN via GST portal" → status → 'validated'.

---

## 6. Development Workflow & Guidelines

### 6.1 Before Writing Code

**ALWAYS:**
1. Trace the feature to its requirement ID (VP-01, KYC-05, ITM-03, etc.).
2. Check the data model (Section 3) — what entities and fields are involved?
3. Check the API contract (Section 4) — what request/response shape?
4. Check the acceptance criteria in Section 5 (security, isolation, audit, validation).
5. Check the component structure guidelines (Section 7) — follow component file structure.
6. Ask: "Does this post to the ledger automatically?" If yes, **stop** — that violates the spec.
7. Ask: "Does this read cross-entity data?" If yes, apply SupplierEntityScope filter.
8. Ask: "Does this change a vendor/item master?" If yes, log to audit and require human confirmation.

### 6.2 Feature Branch & Testing

```
Feature branch naming: feature/REQ_ID-short-desc
  e.g. feature/VP-03-catalogue-manager
       feature/KYC-05-maker-checker
       feature/ITM-01-duplicate-clustering

Automated checks (pre-commit):
  - Lint (ESLint for Angular, StyleCop for .NET)
  - Unit tests (min 80% coverage for core logic)
  - Type safety (TypeScript strict mode, C# nullable reference types)
  - Audit logging: assert that the feature logs all state changes
  - Responsive design: test at all breakpoints (see Section 7)

Integration tests:
  - Multi-entity isolation: create test data in entity A and entity B; assert A's user cannot read B's data
  - Maker-checker: create a pending change request; assert it's not applied until checker approves
  - "No auto-post" rule: submit an ASN/invoice; assert it's 'pending', not posted to the ledger
  - KYC gate: create an inactive vendor; assert portal endpoints return 403 KYC blocked
  - Responsive layout: test at mobile (375px), tablet (768px), desktop (1024px, 1440px)
```

### 6.3 Entity Framework Core Patterns

**Global query filters (automatic scoping):**
```csharp
// In DbContext.OnModelCreating
modelBuilder.Entity<SupplierCatalogue>()
  .HasQueryFilter(c => c.BuyingEntityId.In(GetUserEntityScopes()));

modelBuilder.Entity<PortalInvoice>()
  .HasQueryFilter(i => i.VendorId.In(GetUserVendorIds())); // For suppliers: their vendor_id only
```

**Audit logging on SaveChanges:**
```csharp
public override async Task<int> SaveChangesAsync(...)
{
  var entries = ChangeTracker.Entries()
    .Where(e => e.State != EntityState.Unchanged)
    .ToList();
  
  foreach (var entry in entries)
  {
    var auditLog = new AuditLog
    {
      EntityType = entry.Entity.GetType().Name,
      Action = entry.State.ToString(), // Created, Modified, Deleted
      Actor = _currentUser.Id,
      BeforeState = entry.State == EntityState.Added ? null : _snapshotOld(entry),
      AfterState = entry.State == EntityState.Deleted ? null : _snapshotNew(entry),
      Timestamp = DateTime.UtcNow
    };
    _context.AuditLogs.Add(auditLog);
  }
  
  return await base.SaveChangesAsync(...);
}
```

### 6.4 API Contract Strictness

- **Request validation:** BFF validates every field against the contract (type, range, format) before touching business logic.
- **Response structure:** Always return the exact schema specified in Section 4; never add surprises.
- **HTTP status codes:** Use the codes specified; 403 Forbidden for entity scope violations, 409 Conflict for state machine violations.
- **Error responses:** Consistent error format:
  ```json
  {
    "error": "ENTITY_SCOPE_VIOLATION",
    "message": "Vendor 123 is not contracted to entity 456",
    "request_id": "uuid",
    "timestamp": "2026-10-01T12:34:56Z"
  }
  ```

---

## 7. Angular Component Structure & Responsiveness

### 7.1 Component File Organization (MANDATORY)

**Every Angular component MUST follow this structure:**

```
src/app/modules/supplier-portal/components/
├── catalogue-manager/
│   ├── catalogue-manager.component.ts          ← TypeScript class (logic)
│   ├── catalogue-manager.component.html        ← HTML template (view)
│   ├── catalogue-manager.component.scss        ← Styles (component-scoped, responsive)
│   ├── catalogue-manager.component.spec.ts     ← Unit tests (min 80% coverage)
│   └── catalogue-manager.module.ts             ← Module definition
│
├── po-inbox/
│   ├── po-inbox.component.ts
│   ├── po-inbox.component.html
│   ├── po-inbox.component.scss
│   ├── po-inbox.component.spec.ts
│   └── po-inbox.module.ts
│
├── delivery-note-builder/
│   ├── delivery-note-builder.component.ts
│   ├── delivery-note-builder.component.html
│   ├── delivery-note-builder.component.scss
│   ├── delivery-note-builder.component.spec.ts
│   └── delivery-note-builder.module.ts
│
└── invoice-submission/
    ├── invoice-submission.component.ts
    ├── invoice-submission.component.html
    ├── invoice-submission.component.scss
    ├── invoice-submission.component.spec.ts
    └── invoice-submission.module.ts
```

### 7.2 .ts File - TypeScript Component Class

**MUST contain:**
- Component decorator: `@Component({ selector, templateUrl, styleUrls, ... })`
- Component class extending OnInit, OnDestroy, etc.
- Strongly typed properties (TypeScript strict mode)
- Methods (business logic, state management)
- Lifecycle hooks (ngOnInit, ngOnDestroy)
- Dependency injection via constructor
- Comprehensive error handling
- API calls via services (never direct HTTP in components)
- Memory leak prevention (takeUntil pattern, unsubscribe)

**Example: `catalogue-manager.component.ts`**
```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupplierPortalService } from '@app/services/supplier-portal.service';
import { NotificationService } from '@app/services/notification.service';
import { SupplierCatalogue, SupplierCatalogueLine } from '@app/models';

@Component({
  selector: 'app-catalogue-manager',
  templateUrl: './catalogue-manager.component.html',
  styleUrls: ['./catalogue-manager.component.scss']
})
export class CatalogueManagerComponent implements OnInit, OnDestroy {
  catalogueForm: FormGroup;
  catalogueLines: FormArray;
  selectedCatalogue: SupplierCatalogue | null = null;
  isSubmitting = false;
  isLoading = false;
  errorMessage: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private portalService: SupplierPortalService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.catalogueForm = this.fb.group({
      entityId: ['', Validators.required],
      lines: this.fb.array([])
    });
    this.catalogueLines = this.catalogueForm.get('lines') as FormArray;
  }

  ngOnInit(): void {
    this.loadCatalogue();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCatalogue(): void {
    this.isLoading = true;
    this.portalService.getCatalogues()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        catalogues => {
          this.isLoading = false;
          // Process catalogues
        },
        error => {
          this.isLoading = false;
          this.errorMessage = error.message;
        }
      );
  }

  addLine(): void {
    this.catalogueLines.push(this.createLineGroup());
  }

  removeLine(index: number): void {
    this.catalogueLines.removeAt(index);
  }

  private createLineGroup(): FormGroup {
    return this.fb.group({
      itemCode: ['', Validators.required],
      description: ['', Validators.required],
      packUom: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      currency: ['INR', Validators.required],
      validityFrom: ['', Validators.required],
      validityTo: ['', Validators.required],
      taxClass: ['', Validators.required]
    });
  }

  submitCatalogue(): void {
    if (!this.catalogueForm.valid) {
      this.notificationService.error('Please fill all required fields');
      return;
    }

    this.isSubmitting = true;
    const payload = this.catalogueForm.value;

    this.portalService.submitCatalogue(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        response => {
          this.isSubmitting = false;
          this.notificationService.success('Catalogue submitted for approval');
          this.router.navigate(['/catalogues', response.id]);
        },
        error => {
          this.isSubmitting = false;
          this.errorMessage = error.message;
          if (error.status === 403) {
            this.notificationService.error('KYC status blocks portal access');
          } else if (error.status === 409) {
            this.notificationService.error('Catalogue already submitted');
          }
        }
      );
  }
}
```

### 7.3 .html File - Angular Template (View)

**MUST contain:**
- HTML structure with semantic markup
- Angular directives: `*ngIf`, `*ngFor`, `[ngClass]`, `(click)`, `(submit)`, etc.
- Reactive forms: `[formGroup]`, `formControlName`, `formArrayName`
- Two-way binding: `[(ngModel)]`, `[formControl]`
- Event binding: `(change)="method()"`
- Property binding: `[disabled]="condition"`
- Error messages & validation feedback (per Section 5.4)
- **Responsive design classes** (see Section 7.4)
- Accessibility attributes: `aria-label`, `role`, `id`, `label for`, etc.
- Loading states & spinners

**Example: `catalogue-manager.component.html`**
```html
<div class="catalogue-manager-container">
  <!-- Header -->
  <div class="catalogue-header">
    <h1>Catalogue Manager</h1>
    <p class="subtitle">Publish and manage your product catalogue</p>
  </div>

  <!-- Error Alert -->
  <app-alert *ngIf="errorMessage" 
             type="error" 
             [message]="errorMessage"
             (onClose)="errorMessage = null"
             role="alert">
  </app-alert>

  <!-- Loading Spinner -->
  <app-spinner *ngIf="isLoading" [size]="'lg'"></app-spinner>

  <!-- Main Form -->
  <form [formGroup]="catalogueForm" (ngSubmit)="submitCatalogue()" *ngIf="!isLoading">
    
    <!-- Entity Selection -->
    <div class="form-section">
      <label for="entityId">Buying Entity *</label>
      <select id="entityId" 
              formControlName="entityId"
              class="form-control"
              required
              aria-required="true">
        <option value="">Select entity</option>
        <option value="entity1">Entity 1</option>
        <option value="entity2">Entity 2</option>
      </select>
      <app-validation-error *ngIf="catalogueForm.get('entityId')?.hasError('required')"
                            message="Entity is required">
      </app-validation-error>
    </div>

    <!-- Catalogue Lines -->
    <div class="catalogue-lines-section">
      <h2>Catalogue Lines</h2>
      
      <div formArrayName="lines">
        <div *ngFor="let line of catalogueLines.controls; let i = index" 
             [formGroupName]="i"
             class="line-card"
             role="region"
             [attr.aria-label]="'Catalogue line ' + (i + 1)">
          
          <div class="line-number">Line {{ i + 1 }}</div>
          
          <!-- Row: Item Code & Description -->
          <div class="form-row">
            <div class="form-group col-md-6 col-sm-12">
              <label for="itemCode_{{ i }}">Item Code *</label>
              <input type="text" 
                     id="itemCode_{{ i }}"
                     formControlName="itemCode"
                     class="form-control"
                     placeholder="Enter item code"
                     required>
              <app-validation-error *ngIf="line.get('itemCode')?.hasError('required')"
                                    message="Item code is required">
              </app-validation-error>
            </div>

            <div class="form-group col-md-6 col-sm-12">
              <label for="description_{{ i }}">Description *</label>
              <input type="text" 
                     id="description_{{ i }}"
                     formControlName="description"
                     class="form-control"
                     placeholder="Product description"
                     required>
            </div>
          </div>

          <!-- Row: Price, Currency, UOM, Tax -->
          <div class="form-row">
            <div class="form-group col-md-3 col-sm-6">
              <label for="price_{{ i }}">Price *</label>
              <input type="number" 
                     id="price_{{ i }}"
                     formControlName="price"
                     class="form-control"
                     step="0.01"
                     min="0"
                     required>
            </div>

            <div class="form-group col-md-3 col-sm-6">
              <label for="currency_{{ i }}">Currency *</label>
              <select id="currency_{{ i }}" 
                      formControlName="currency"
                      class="form-control"
                      required>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div class="form-group col-md-3 col-sm-6">
              <label for="uom_{{ i }}">UOM *</label>
              <input type="text" 
                     id="uom_{{ i }}"
                     formControlName="packUom"
                     class="form-control"
                     placeholder="e.g., kg, ltr, pcs"
                     required>
            </div>

            <div class="form-group col-md-3 col-sm-6">
              <label for="taxClass_{{ i }}">Tax Class *</label>
              <select id="taxClass_{{ i }}" 
                      formControlName="taxClass"
                      class="form-control"
                      required>
                <option value="">Select tax class</option>
                <option value="standard">Standard (5%)</option>
                <option value="zero">Zero</option>
              </select>
            </div>
          </div>

          <!-- Row: Validity Dates -->
          <div class="form-row">
            <div class="form-group col-md-6 col-sm-12">
              <label for="validityFrom_{{ i }}">Validity From *</label>
              <input type="date" 
                     id="validityFrom_{{ i }}"
                     formControlName="validityFrom"
                     class="form-control"
                     required>
            </div>

            <div class="form-group col-md-6 col-sm-12">
              <label for="validityTo_{{ i }}">Validity To *</label>
              <input type="date" 
                     id="validityTo_{{ i }}"
                     formControlName="validityTo"
                     class="form-control"
                     required>
            </div>
          </div>

          <!-- Remove Line Button -->
          <div class="line-actions">
            <button type="button" 
                    class="btn btn-danger btn-sm"
                    (click)="removeLine(i)"
                    *ngIf="catalogueLines.length > 1"
                    aria-label="Remove line {{ i + 1 }}">
              Remove Line
            </button>
          </div>
        </div>
      </div>

      <!-- Add Line Button -->
      <button type="button" 
              class="btn btn-secondary"
              (click)="addLine()"
              aria-label="Add new catalogue line">
        + Add Line
      </button>
    </div>

    <!-- Submit Buttons -->
    <div class="form-actions">
      <button type="submit" 
              class="btn btn-primary"
              [disabled]="!catalogueForm.valid || isSubmitting"
              aria-busy="isSubmitting">
        <span *ngIf="!isSubmitting">Submit Catalogue for Approval</span>
        <span *ngIf="isSubmitting">
          <app-spinner [inline]="true"></app-spinner> Submitting...
        </span>
      </button>
      <button type="button" 
              class="btn btn-secondary"
              (click)="router.navigate(['/catalogues'])">
        Cancel
      </button>
    </div>
  </form>
</div>
```

### 7.4 .scss File - Component-Scoped Styles (Responsive Design) ← **CRITICAL**

**MUST contain:**
- **Mobile-first responsive design** (base styles for mobile, media queries for larger screens)
- CSS Grid or Flexbox for layouts (NO hardcoded pixel widths)
- Responsive breakpoints at: 320px (mobile), 480px, 768px (tablet), 1024px (desktop), 1440px
- Media queries using SCSS mixins for consistency
- Component-scoped styles (BEM naming, nested under component root class)
- Shared theme variables imported from global styles
- Touch-friendly sizing (buttons min 44×44px, spacing ≥ 1rem)
- Accessibility considerations (focus states, color contrast)

**Responsive Breakpoints (MUST use these):**
```scss
// In src/app/styles/variables.scss
$breakpoints: (
  'mobile': 320px,
  'mobile-lg': 480px,
  'tablet': 768px,
  'desktop': 1024px,
  'desktop-lg': 1440px,
  'ultra-wide': 1920px
);

@mixin breakpoint($name) {
  @media (min-width: map-get($breakpoints, $name)) {
    @content;
  }
}
```

**Example: `catalogue-manager.component.scss`**
```scss
// Import shared theme variables & mixins
@import '@app/styles/variables';
@import '@app/styles/mixins';

// Root container - mobile-first
.catalogue-manager-container {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;

  // Tablet+
  @include breakpoint(tablet) {
    padding: 2rem;
  }

  // Desktop+
  @include breakpoint(desktop) {
    padding: 2.5rem 3rem;
  }
}

// Header
.catalogue-header {
  margin-bottom: 2rem;

  h1 {
    font-size: 1.5rem;
    color: var(--color-primary-dark);
    margin-bottom: 0.5rem;

    @include breakpoint(desktop) {
      font-size: 2rem;
    }
  }

  .subtitle {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }
}

// Form section wrapper
.form-section {
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  background-color: var(--color-surface);
  border-radius: 6px;
  border: 1px solid var(--color-border);

  label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--color-text-primary);
    font-size: 0.9rem;
  }

  .form-control {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.95rem;
    transition: border-color 0.2s, box-shadow 0.2s;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(41, 128, 185, 0.1);
    }

    &:disabled {
      background-color: var(--color-disabled);
      cursor: not-allowed;
    }
  }
}

// Catalogue lines section
.catalogue-lines-section {
  margin-bottom: 2rem;

  h2 {
    font-size: 1.1rem;
    margin-bottom: 1rem;
    color: var(--color-text-primary);

    @include breakpoint(desktop) {
      font-size: 1.3rem;
    }
  }
}

// Line card - mobile-first, single column
.line-card {
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  border-left: 4px solid var(--color-primary);

  .line-number {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text-secondary);
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  @include breakpoint(tablet) {
    padding: 1.25rem;
    margin-bottom: 1.25rem;
  }
}

// Form rows - responsive grid
.form-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;

  // Tablet: 2 columns
  @include breakpoint(tablet) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  // Desktop: 3-4 columns (responsive auto-fit)
  @include breakpoint(desktop) {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1.25rem;
  }
}

// Form groups
.form-group {
  display: flex;
  flex-direction: column;

  // Responsive column spanning
  &.col-md-3 {
    @include breakpoint(tablet) {
      grid-column: span 1;
    }
  }

  &.col-md-6 {
    @include breakpoint(tablet) {
      grid-column: span 1;
    }
  }

  &.col-sm-6 {
    @include breakpoint(tablet) {
      grid-column: span 1;
    }
  }

  &.col-sm-12 {
    @include breakpoint(tablet) {
      grid-column: span 1;
    }
  }

  label {
    font-weight: 600;
    margin-bottom: 0.4rem;
    color: var(--color-text-primary);
    font-size: 0.85rem;
  }

  .form-control {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.9rem;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(41, 128, 185, 0.08);
    }
  }

  app-validation-error {
    margin-top: 0.3rem;
  }
}

// Line actions
.line-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-light);

  button {
    flex: 1;

    @include breakpoint(tablet) {
      flex: 0 1 auto;
    }
  }
}

// Form actions (submit/cancel buttons) - stack on mobile, side-by-side on desktop
.form-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);

  @include breakpoint(tablet) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  @include breakpoint(desktop) {
    grid-template-columns: auto auto;
    justify-content: flex-start;
    gap: 1rem;
  }
}

// Buttons - touch-friendly (min 44×44px), responsive
.btn {
  min-height: 44px;
  padding: 0.6rem 1.25rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  @include breakpoint(tablet) {
    padding: 0.75rem 1.5rem;
    font-size: 0.95rem;
  }

  &.btn-primary {
    background-color: var(--color-primary);
    color: white;

    &:hover:not(:disabled) {
      background-color: var(--color-primary-dark);
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    &:disabled {
      background-color: var(--color-disabled);
      cursor: not-allowed;
      opacity: 0.6;
    }

    &:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  &.btn-secondary {
    background-color: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);

    &:hover {
      background-color: var(--color-background);
      border-color: var(--color-text-secondary);
    }

    &:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  &.btn-danger {
    background-color: var(--color-danger);
    color: white;

    &:hover:not(:disabled) {
      background-color: darken(#dc3545, 8%);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  &.btn-sm {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    min-height: 36px;
  }
}

// Extra small screens (< 480px)
@media (max-width: 479px) {
  .catalogue-manager-container {
    padding: 0.75rem;
  }

  .line-card {
    padding: 0.75rem;
    border-left-width: 3px;
  }

  .form-row {
    gap: 0.5rem;
  }

  .btn {
    width: 100%;

    &:not(:last-child) {
      margin-bottom: 0.5rem;
    }
  }

  .line-actions button {
    width: 100%;
  }
}

// Print styles (optional)
@media print {
  .btn,
  .form-actions {
    display: none;
  }

  .line-card {
    page-break-inside: avoid;
  }
}
```

### 7.5 .spec.ts File - Unit Tests (Min 80% Coverage)

**MUST contain:**
- Component initialization tests
- Input/Output tests
- User interaction tests (click, submit, input)
- Form validation tests
- Service integration tests (mocked)
- Error handling tests
- Responsive layout tests (basic)
- Min 80% code coverage

**Example: `catalogue-manager.component.spec.ts`**
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CatalogueManagerComponent } from './catalogue-manager.component';
import { SupplierPortalService } from '@app/services/supplier-portal.service';
import { NotificationService } from '@app/services/notification.service';
import { of, throwError } from 'rxjs';

describe('CatalogueManagerComponent', () => {
  let component: CatalogueManagerComponent;
  let fixture: ComponentFixture<CatalogueManagerComponent>;
  let mockPortalService: jasmine.SpyObj<SupplierPortalService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    mockPortalService = jasmine.createSpyObj('SupplierPortalService', [
      'getCatalogues',
      'submitCatalogue'
    ]);
    mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'success',
      'error'
    ]);

    await TestBed.configureTestingModule({
      declarations: [CatalogueManagerComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: SupplierPortalService, useValue: mockPortalService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogueManagerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load catalogues on init', () => {
    mockPortalService.getCatalogues.and.returnValue(of([]));
    fixture.detectChanges();
    expect(mockPortalService.getCatalogues).toHaveBeenCalled();
  });

  it('should add a line to the form array', () => {
    component.addLine();
    expect(component.catalogueLines.length).toBe(1);
  });

  it('should remove a line from the form array', () => {
    component.addLine();
    component.addLine();
    component.removeLine(0);
    expect(component.catalogueLines.length).toBe(1);
  });

  it('should not submit invalid form', () => {
    component.catalogueForm.patchValue({ entityId: '' });
    component.submitCatalogue();
    expect(mockPortalService.submitCatalogue).not.toHaveBeenCalled();
    expect(mockNotificationService.error).toHaveBeenCalled();
  });

  it('should handle submission error 403 (KYC blocked)', () => {
    const error = { status: 403, message: 'KYC blocked' };
    mockPortalService.submitCatalogue.and.returnValue(throwError(error));
    component.catalogueForm.patchValue({ entityId: 'entity1' });
    component.addLine();
    component.catalogueLines.at(0)?.patchValue({
      itemCode: 'ITEM001',
      description: 'Test Item',
      packUom: 'kg',
      price: 100,
      currency: 'INR',
      validityFrom: '2026-10-01',
      validityTo: '2027-10-01',
      taxClass: 'standard'
    });

    component.submitCatalogue();

    expect(mockNotificationService.error).toHaveBeenCalledWith('KYC status blocks portal access');
  });

  it('should handle submission success', (done) => {
    const mockResponse = { id: 'cat-123', status: 'submitted', submitted_at: '2026-10-01T10:00:00Z' };
    mockPortalService.submitCatalogue.and.returnValue(of(mockResponse));
    component.catalogueForm.patchValue({ entityId: 'entity1' });
    component.addLine();
    component.catalogueLines.at(0)?.patchValue({
      itemCode: 'ITEM001',
      description: 'Test',
      packUom: 'kg',
      price: 100,
      currency: 'INR',
      validityFrom: '2026-10-01',
      validityTo: '2027-10-01',
      taxClass: 'standard'
    });

    component.submitCatalogue();

    setTimeout(() => {
      expect(mockNotificationService.success).toHaveBeenCalledWith('Catalogue submitted for approval');
      done();
    });
  });

  it('should unsubscribe on destroy', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');
    component.ngOnDestroy();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
```

### 7.6 Responsive Breakpoints & Design System

**ALL components MUST be responsive. Use these breakpoints:**

| Screen Size | Breakpoint | Example Devices | Layout Pattern |
|---|---|---|---|
| **Mobile** | 320–479px | iPhone SE, small phones | Single column, stacked, touch-friendly (44×44px min) |
| **Mobile LG** | 480–767px | iPhone 12, large phones | Single-2 columns, optimized for thumb reach |
| **Tablet** | 768–1023px | iPad, Android tablets | 2–3 columns, card-based layout |
| **Desktop** | 1024–1439px | MacBook, Windows laptops | 3–4 columns, full sidebar if needed |
| **Desktop LG** | 1440–1919px | 27" monitor | 4+ columns, extended layouts |
| **Ultra-wide** | 1920px+ | 4K monitors | Full-width with max-width container (1400px) |

**Mobile-First Design Principles (MANDATORY):**
1. **Write base styles for mobile first** — then add `@include breakpoint()` for larger screens
2. **Use CSS Grid or Flexbox** — NO hardcoded pixel widths; use `flex: 1`, `grid-template-columns: repeat(auto-fit, minmax(...))`
3. **Touch-friendly UI** — buttons/inputs min 44×44px; tap targets 1rem+ apart
4. **Readable text** — base 0.9rem on mobile → 0.95rem (tablet) → 1rem (desktop)
5. **Images responsive** — use `max-width: 100%`, `height: auto`
6. **Forms stack** — single column on mobile; 2–3 columns on tablet+
7. **Navigation** — hamburger menu on mobile; full nav on desktop
8. **Test before commit** — open DevTools responsive mode; test at 375px, 768px, 1024px, 1440px

### 7.7 Summary: Component Files & Responsibilities

| File Type | Responsibility | Example |
|---|---|---|
| **.ts** | Component class, state, methods, lifecycle, DI, API calls | `ngOnInit()`, `submitCatalogue()`, `takeUntil(destroy$)` |
| **.html** | Template, directives, bindings, validation, a11y, responsive markup | `*ngIf`, `formGroup`, `[disabled]`, `aria-label` |
| **.scss** | Responsive styles, media queries, CSS Grid/Flexbox, theme variables, accessibility | `@include breakpoint(tablet)`, `grid-template-columns`, `focus { outline: ... }` |
| **.spec.ts** | Unit tests, service mocks, form tests, error handling, min 80% coverage | `it('should...', ...)`, `expect(...)` |
| **.module.ts** | Module definition, imports, declarations, providers | Import component, shared modules, services |

**Non-negotiable rules:**
- ✅ **YES:** Each component has separate .ts and .html files
- ✅ **YES:** Each component has .scss with responsive media queries
- ✅ **YES:** Each component is tested (min 80% coverage)
- ✅ **YES:** All components are responsive (mobile → ultra-wide)
- ❌ **NO:** Inline styles in .html
- ❌ **NO:** Hardcoded breakpoints (use mixins)
- ❌ **NO:** Direct HTTP calls in components (use services)
- ❌ **NO:** Memory leaks (always use `takeUntil(destroy$)`)

---

## 8. Testing Strategy

### 8.1 Unit Tests (Min 80% coverage)

**Priority targets:**
- GSTIN/PAN validation logic (exact check-digit computation)
- Invoice matching algorithm (variance calculation, tolerance logic)
- Item normalisation (abbreviation expansion, unit canonicalisation)
- Duplicate blocking rules (hard blocks for exact GSTIN / exact bank-on-different-name)
- Form validation
- Service methods (mocked HTTP)

### 8.2 Integration Tests (Multi-entity Isolation & State Machine)

**Test areas:**
- Multi-entity isolation: entity_A's user cannot read entity_B's data
- KYC gating: blocked vendor cannot submit invoices
- Maker-checker: pending changes don't take effect until approval
- "No auto-post" rule: ASN/invoice are 'pending', not posted automatically
- Responsive layout: test at 375px, 768px, 1024px, 1440px breakpoints

### 8.3 E2E Tests (Supplier Journey)

```
Scenario: Supplier publishes catalogue, receives PO, acknowledges, submits ASN, submits invoice

Given: Supplier is registered and KYC-validated
When: Supplier logs into the portal
Then: Dashboard shows empty PO inbox

When: Supplier publishes catalogue with 5 lines
Then: Status is "submitted"

When: Buyer approves catalogue
Then: Supplier is notified

When: PO is created and delivered to supplier
Then: Supplier sees PO in inbox as "pending acknowledgement"

When: Supplier acknowledges PO
Then: Status changes to "acknowledged"

When: Supplier submits ASN
Then: ASN is "submitted", appears to stores as "pending receipt"

When: Supplier submits invoice
Then: Invoice is matched or mismatched (surface reasons)

When: Supplier views account statement
Then: Shows outstanding, scheduled, completed payments
```

---

## 9. Requirement Traceability Matrix

Complete map of every Phase B requirement to its implementation. See Section 9 of original SKILL.md for full matrix (all 26 requirements mapped to module, feature, workstream, and implementation notes).

---

## 10. Development Priorities & Timeline

### 10.1 Must / Should / Could (Phase B Release)

**MUST (Q4 2026 release):**
- All VP-01 to VP-08, VP-11 (portal core)
- All KYC-01 to KYC-02, KYC-04 to KYC-08 (KYC & vendor de-dup)
- All ITM-01 to ITM-04 (item de-dup core)

**SHOULD (fast-follow if time):**
- VP-09, VP-10 (account view, notifications)
- KYC-03 (external verification, if API contracted)
- ITM-05, ITM-06 (cross-UOM guards, creation-time warnings)

**COULD:**
- VP-12 (premium branding themes)

### 10.2 Key Milestones

| Milestone | Target | Criteria |
|---|---|---|
| M1 Design Freeze | End Jul 2026 | Data model, API contracts, IdP decision, KYC-03 decision, MUST cut signed off |
| M2 Foundation Complete | End Jul 2026 | Auth domain live, BFF skeleton with entity scope, Gateway reads, scaffolds, CI/CD |
| M3 Clean Masters Ready | End Sep 2026 | KYC validation, maker-checker, vendor & item merge with history re-pointing working |
| M4 Portal Feature-Complete | End Oct 2026 | E2E supplier journey works against live APIs |
| M5 Release Candidate | End Nov 2026 | All acceptance criteria pass, isolation/licence/perf tests green |
| M6 Pilot Live | Dec 2026 | Contracted suppliers transacting at 1–2 properties, no internal licence consumed |

---

## 11. Common Gotchas & Anti-Patterns

### **STOP: Critical Anti-Patterns**

🚫 **Auto-post to ledger**
- **Anti-pattern:** Portal submits invoice → directly posts to Payable.
- **Correct:** Portal submits invoice → PortalInvoice (pending) → AP team manually posts after review.

🚫 **Supplier upload directly to core tables**
- **Anti-pattern:** Supplier file upload → stored in PO/GRN table.
- **Correct:** Supplier upload → Document Repository; linked via PortalInvoice.document_ref.

🚫 **Ignore entity scope**
- **Anti-pattern:** `GET /catalogues` returns all catalogues regardless of user's entity.
- **Correct:** BFF enforces SupplierEntityScope filter; query includes WHERE clause.

🚫 **Client-side "security"**
- **Anti-pattern:** Hide buttons if KYC status is 'incomplete'.
- **Correct:** Server rejects request with 403 if KYC status is 'incomplete'.

🚫 **Silent merges**
- **Anti-pattern:** ML proposes duplicate → auto-merge if score > 0.95.
- **Correct:** ML proposes → human confirms or dismisses; merge is explicit decision.

🚫 **Hardcoded breakpoints**
- **Anti-pattern:** `.tablet { @media (min-width: 768px) { ... } }`
- **Correct:** `@include breakpoint(tablet) { ... }`

🚫 **Inline styles in HTML**
- **Anti-pattern:** `<div style="padding: 1rem; color: blue;">...</div>`
- **Correct:** Define in .scss, apply via `[ngClass]` or plain `class=`

🚫 **Memory leaks in subscriptions**
- **Anti-pattern:** `this.service.getData().subscribe(data => { this.data = data; })`
- **Correct:** `.pipe(takeUntil(this.destroy$)).subscribe(...)`

🚫 **Hardcoded secrets with a "safe" fallback**
- **Anti-pattern:** `builder.Configuration["Jwt:Key"] ?? "DevSecretKey_ChangeInProduction_32Chars!"` — the fallback ships to production the moment someone forgets to set the real env var, and it's sitting in git history either way.
- **Correct:** Fail fast — throw at startup if a required secret is missing. Never give a production secret a working default.

🚫 **Swallowing startup failures in one broad try/catch**
- **Anti-pattern:** Wrapping `db.Database.Migrate()` together with unrelated cleanup logic in a single try/catch that only logs — the app "starts" and looks healthy while running against a broken/out-of-date schema.
- **Correct:** Let infrastructure-critical startup steps (migrations) crash the process on failure. Only wrap genuinely non-critical steps (e.g. a one-time data cleanup) in their own try/catch.

🚫 **Duplicate root shells rendering the same chrome**
- **Anti-pattern:** Both the app's root component and a routed layout component render their own topbar/nav — every screen ends up with two stacked headers, two of every selector.
- **Correct:** Exactly one component owns the app chrome. The root component should be a thin `<router-outlet>` shell with no layout markup of its own.

🚫 **`[value]` binding on a native `<select>` for state that changes externally**
- **Anti-pattern:** `<select [value]="currentLanguage" (change)="...">` — works on first render, then silently desyncs the next time the bound value changes from outside a user click (e.g. restored from `localStorage` on app init), because native `<select>` elements don't reliably re-select the matching `<option>` outside Angular's own form directives.
- **Correct:** Use `[ngModel]`/`formControl` so `SelectControlValueAccessor` handles re-sync correctly. (Found live: `dir="rtl"` and `lang="ar"` were correctly restored on reload, but the language `<select>` itself still showed "English" until switched to `ngModel`.)

🚫 **Flag emoji as a language switcher**
- **Anti-pattern:** Mapping a language code to a national flag, e.g. Arabic → 🇸🇦.
- **Correct:** Flag emoji are built from ISO country codes, not language codes — many languages (English, Arabic, Spanish...) have no single "home" country, so the mapping is arbitrary and can look wrong to users from other countries speaking the same language. Prefer the language's own name or a plain code (EN/AR/VI/TH).

---

## 12. How to Use This SKILL.md

### Before every coding session:

1. **Read Section 1** (Project Overview) to keep scope clear.
2. **Read Section 3** (Data Model) or Section 4 (APIs) for the feature you're building.
3. **Check Section 9** (Requirement Traceability) to find your requirement ID and acceptance criteria.
4. **Read Section 5** (Security) for isolation, validation, audit rules.
5. **Read Section 7** (Component Structure) for Angular patterns, responsiveness, testing.
6. **Read Section 6** (Workflow) for patterns and gotchas.

### During code review:

- Does the code trace to a requirement ID?
- Does it enforce entity scope if reading/writing supplier data?
- Does it log to audit if changing a master?
- Does it post to the ledger automatically? (If yes, STOP.)
- Does it pass the "human in the loop" test? (Approval, confirmation, decision required?)
- **Is the component responsive?** Test at 375px, 768px, 1024px, 1440px.
- **Are .ts, .html, .scss, .spec.ts all present?** Each in separate file?
- **Is it tested?** Min 80% coverage?

### During QA:

- See Section 8 (Testing) for test templates and priorities.
- Isolation tests: every endpoint, assert cross-entity user gets 403 or sees nothing.
- State machine tests: verify that pending changes don't take effect until approved.
- Responsive tests: DevTools responsive mode at all breakpoints.

---

## 13. Document Control & Changes

| Version | Date | Changes | Status |
|---|---|---|---|
| 0.1 (Draft) | 26 Jun 2026 | Initial creation from Functional Spec §§5.1–5.3, 6 | — |
| 1.0 (Complete) | 22 Jul 2026 | Integrated Angular component structure (§7), responsive design requirements, unit test examples, merged with Component Structure Addendum | ✅ FINAL |
| 1.1 | 22 Jul 2026 | Documented an engineering hardening pass against the running codebase (not a spec change — spec requirements unchanged). See notes below. Added 5 new entries to §11 Common Gotchas. | ✅ |

### 13.1 Engineering notes — 22 Jul 2026 hardening pass

A security/code-quality review of `WebProlific.Api`/`Infrastructure` and a UX audit of `supplier-portal` surfaced gaps against this spec's own requirements (§5 Security, §6 Workflow, §7 Component Structure). Fixed, in order:

**Backend (`WebProlific.Api`) — closes gaps against §5 Security:**
- Removed hardcoded JWT signing key and DB connection string from `appsettings.json`/`render.yaml`/code fallbacks; both now fail fast at startup if unset (§5's auth requirements assumed a real secret existed — it didn't).
- Added a global `FallbackPolicy` requiring authentication — previously only `AuthController.GetCurrentUser` carried `[Authorize]`; every other controller (Vendors, Catalogues, PurchaseOrders, Invoices, KYC, MakerChecker, Dedup, Notifications, Configuration) was fully anonymous.
- Fixed IDOR across all 10 controllers — endpoints trusted a client-supplied `vendorId`/`userId` with no ownership check. This is the exact "Ignore entity scope" anti-pattern already listed in §11; the fix follows the pattern already prescribed there (`CanAccessVendor` helper + `[Authorize(Policy = "InternalOnly")]` for governance-only actions).
- Gated Swagger to Development only; scoped CORS to configured origins instead of `AllowAnyOrigin`.
- Split the startup migration/cleanup try-catch so migration failures fail fast instead of being silently logged and ignored (was masking a real schema-drift issue, confirmed in logs).
- `CurrencyConversionService` no longer fabricates a 1:1 exchange rate when a real rate is unavailable — returns `null` (no display value) instead of a wrong number.
- `LocalizationMiddleware` no longer 500s on a malformed `Accept-Language` header.
- Untracked `node_modules`/`bin`/`obj`/logs from git; added `.gitignore` (none existed).
- Deliberately **not done**: real OTP/MFA (currently a UI-only step with no backend enforcement — flagged, not fixed, pending a product decision on whether to build real delivery infra or remove the step), the empty `WebProlific.Shared/DTOs` layer, Vendor cascade-delete FK risk, `AppUser.Email` unique index, and the `OFFSET/FETCH` pagination bug affecting all paginated list endpoints (SQL Server compatibility-level issue, tracked separately).

**Frontend (`supplier-portal`) — closes gaps against §7 Component Structure and completes i18n:**
- Fixed a structural bug causing duplicate topbars/language/currency selectors on every authenticated screen (both `AppComponent` and `LayoutComponent` rendered full chrome).
- Language preference now actually persists across reloads (was written to `localStorage`, never read back) and drives `dir`/`lang` on `<html>` for real RTL support (previous implementation was a no-op CSS class).
- Full translation coverage: previously only the login screen used the translate pipe; all 7 screens are now translated across all 4 languages already declared in the selector (en/ar/vi/th), with verified key parity (230 keys × 4 languages, zero gaps).
- Added logical-property RTL rules to `styles.scss` per this doc's own "no hardcoded left/right in SCSS" requirement (§7.4); two pre-existing hardcoded instances fixed.

**Known convention gap, not resolved:** §7.4 prescribes a mobile-first SCSS architecture with a shared `$breakpoints` map and `@include breakpoint()` mixin from `src/app/styles/variables.scss`. The actual codebase uses desktop-first inline component styles with raw `@media (max-width: …)` queries, and no shared mixin file exists. Retrofitting every existing component to the prescribed architecture is a separate, larger migration and was out of scope for this pass — new/touched code in this pass followed the spec's breakpoint *values* (320/480/768/1024/1440) but not its file structure.

**To update this document:**
- Create a pull request in the project repository (`/SKILL.md`).
- Include rationale for changes.
- Require approval from Architect + Product Owner before merging.
- Version bump + date + log in this table.
- **Regenerate all dependent documentation** (backlog, test plan, acceptance criteria).

---

**END OF COMPLETE SKILL.MD**

*This document is the SINGLE SOURCE OF TRUTH for Web Prol'IFIC Phase B development. Every feature, bug fix, refactor, and component MUST trace to this specification and follow its requirements.*

*Last reviewed & certified: 22 July 2026*
