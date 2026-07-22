# SKILL.md Quick Reference Guide
## Web Prol'IFIC Phase B Supplier Portal

### 📖 Document Structure

The complete [`SKILL.md`](./SKILL.md) is organized into 13 major sections:

#### **1. Project Overview** (Lines 1-100)
- Scope & objectives (3 capabilities: Supplier Portal, KYC, Item De-dup)
- Non-negotiable constraints (human in loop, no auto-posting, etc.)
- Out of scope items (Phase C/D deferred features)

#### **2. Solution Architecture** (Lines 101-200)
- Technology stack (Angular LTS, .NET 8, Python/FastAPI, SQL Server)
- Component architecture diagram
- Integration boundary (critical: **Integration Gateway is only path to ledger**)

#### **3. Data Model** (Lines 201-600)
- **3.1:** Supplier Portal entities (SupplierUser, SupplierCatalogue, POAcknowledgement, DeliveryNote, PortalInvoice, Notification)
- **3.2:** KYC & Vendor De-dup entities (VendorKYCProfile, KYCChangeRequest, VendorDuplicateCandidateSet, VendorMergeAudit)
- **3.3:** Item De-dup entities (ItemDuplicateCluster, ItemMergeAudit, ItemNormalisationCache)

#### **4. API Specification** (Lines 601-1100)
- **4.1:** Supplier Portal BFF endpoints (Auth, Catalogue, PO, ASN, Invoice, Account, Notifications)
- **4.2:** Internal Governance Console (KYC, Vendor De-dup, Item De-dup, Catalogue Approval)
- **4.3:** Integration Gateway (Read: POs/GRNs/Payables; Write: Pending actions; Merge: Transactional)

#### **5. Security & Non-Functional** (Lines 1101-1350)
- Multi-entity isolation (CRITICAL)
- Authentication & identity (Separate supplier realm, no licence bleed)
- Authorization & RBAC (Supplier roles, Governance roles)
- Data validation & sanitization (GSTIN/PAN/IFSC/Price/Qty/Dates)
- Audit & traceability (AuditLog schema, audited actions)
- Data residency (India-hosted)
- Performance targets (Login < 2s, List POs < 1s, etc.)
- Human-in-the-loop guarantee (No automation)
- External verification (KYC-03 optional API)

#### **6. Development Workflow** (Lines 1351-1550)
- Before writing code: 8-step checklist
- Feature branch naming: `feature/REQ_ID-short-desc`
- EF Core patterns (Global query filters, audit logging)
- API contract strictness

#### **7. Angular Component Structure & Responsiveness** ← **NEW SECTION** (Lines 1551-2000)
- **7.1:** File organization (mandatory structure with .ts, .html, .scss, .spec.ts)
- **7.2:** .ts file requirements (Component class, lifecycle, DI, error handling, memory leak prevention)
- **7.3:** .html file requirements (Template, directives, bindings, accessibility, responsive markup)
- **7.4:** .scss file requirements (Mobile-first, CSS Grid/Flexbox, responsive breakpoints, touch-friendly, accessibility)
- **7.5:** .spec.ts file requirements (80%+ coverage, unit tests, error handling)
- **7.6:** Responsive breakpoints (320px → 1920px+, mobile-first, grid patterns)
- **7.7:** Summary table (what goes where)

#### **8. Testing Strategy** (Lines 2148-2201)
- Unit tests (80%+ coverage, GSTIN/PAN validation, invoice matching, de-dup logic)
- Integration tests (isolation, KYC gate, maker-checker, responsive layout)
- E2E tests (full supplier journey)

#### **9. Requirement Traceability Matrix** (Lines 2202-2207)
- All 26 requirements (VP-01–12, KYC-01–08, ITM-01–06)
- Mapped to module, feature, workstream, implementation notes

#### **10. Development Priorities & Timeline** (Lines 2208-2237)
- Must/Should/Could prioritization
- Milestones M1–M6 (Q4 2026 target)

#### **11. Common Gotchas & Anti-Patterns** (Lines 2238-2295)
- 13 CRITICAL anti-patterns to avoid (8 original + 5 added in v1.1 from the Jul 22 hardening pass — hardcoded secret fallbacks, swallowed startup failures, duplicate root shells, `[value]`-bound selects, flag-emoji language pickers)
- Mobile-first anti-patterns
- Memory leak anti-patterns

#### **12. How to Use This SKILL.md** (Lines 2296-2326)
- Before coding: 6-step checklist
- During code review: 8-question checklist
- During QA: 3-focus areas

#### **13. Document Control** (Lines 2327-2371)
- Version history
- **§13.1: Jul 22 2026 engineering hardening notes** — what was fixed in the backend/frontend and what's deliberately still open
- Update process

---

### 🎯 Quick Lookup by Task

**I need to build... → Go to Section:**

| Task | Section |
|---|---|
| Catalogue Manager component | 7.2–7.5 (Component file structure + examples) + 4.1 (APIs) |
| KYC validation logic | 3.2 (Data model) + 5.4 (Validation rules) + 8.1 (Unit tests) |
| Invoice matching | 3.1 (PortalInvoice schema) + 4.1 (POST /invoices) + 8.1 (Tests) |
| Vendor de-duplication | 3.2 (Data model) + 4.2 (Governance API) + 11 (Anti-patterns) |
| Item de-duplication | 3.3 (Data model) + 4.2 (Governance API) |
| Portal authentication | 4.1 (Auth endpoints) + 5.2 (Supplier realm) + 5.3 (RBAC) |
| Multi-entity isolation | 3.1 (SupplierEntityScope) + 5.1 (Implementation) + 8.2 (Integration tests) |
| Responsive design | 7.4 (SCSS with breakpoints) + 7.6 (Breakpoint table) |
| Unit test template | 7.5 (.spec.ts example) + 8.1 (Coverage targets) |
| Audit logging | 5.5 (Audit schema) + 6.3 (EF Core pattern) |
| Feature checklist | 6.1 (Before writing code) |

---

### 🚀 Getting Started in 5 Steps

#### Step 1: Set Up Repository
```bash
git clone <project-repo>
cd VendorPortalExtranet
# SKILL.md lives in docs/ — no copying needed
```

#### Step 2: Create Feature Branch
```bash
# Branch naming per SKILL.md §6.2
git checkout -b feature/VP-03-catalogue-manager
```

#### Step 3: Read Before Coding
- Read Section 1 (scope)
- Read Section 3 (data model for feature)
- Read Section 4 (APIs for feature)
- Read Section 7 (component structure)
- Find requirement ID in Section 9 (traceability)

#### Step 4: Implement
- Create component with .ts, .html, .scss, .spec.ts per Section 7.1
- Follow patterns in Section 7.2–7.5
- Ensure responsive at all breakpoints (Section 7.6)
- Implement validation per Section 5.4
- Add audit logging per Section 5.5
- Write tests (min 80% coverage, Section 8.1)

#### Step 5: Review & Commit
```bash
# Pre-commit checks (Section 6.2)
npm run lint
npm run test
npm run build

# Commit message format
git commit -m "feature/VP-03: Implement catalogue manager

- Add catalogue CRUD with deviation detection (VP-03, VP-04)
- Enforce entity scope in BFF (VP-02)
- Add unit tests (80% coverage)
- Responsive design (mobile → desktop)
- Audit logging on submit

Per SKILL.md §6.2 & §7"
```

---

### 🔒 Security Checklist

Before submitting any PR, verify:

- [ ] **Entity scope:** BFF filters by SupplierEntityScope? (§5.1)
- [ ] **No auto-post:** Does NOT post to ledger automatically? (§11)
- [ ] **Audit logging:** All state changes logged? (§5.5)
- [ ] **Validation:** Server-side validation on all inputs? (§5.4)
- [ ] **Error handling:** Consistent error response format? (§6.4)
- [ ] **Auth gating:** KYC status checked before portal actions? (§5.3)
- [ ] **Responsive:** Tested at 375px, 768px, 1024px, 1440px? (§7.6)
- [ ] **Tests:** Min 80% coverage, isolation tests pass? (§8)

---

### 📋 Component Creation Template

```bash
# Create component structure per SKILL.md §7.1
ng generate component modules/supplier-portal/components/my-component

# You'll get:
# ✓ my-component.component.ts
# ✓ my-component.component.html
# ✓ my-component.component.scss
# ✓ my-component.component.spec.ts

# Edit each file per guidelines:
# .ts (§7.2):    Class, lifecycle, DI, methods, error handling
# .html (§7.3):  Template, directives, bindings, a11y, responsive markup
# .scss (§7.4):  Mobile-first, CSS Grid, media queries, breakpoints
# .spec.ts (§7.5): Tests (80%+ coverage)
```

---

### 🎓 Learning Resources

**Within this SKILL.md:**
- Full Angular component examples: §7.2–7.5
- Responsive design patterns: §7.4 (SCSS example with media queries)
- Unit test examples: §7.5 (.spec.ts example with mocks)
- API contract examples: §4.1–4.3 (request/response schemas)
- Data model examples: §3.1–3.3 (entity schemas)

**External references:**
- Angular docs: https://angular.io
- TypeScript strict mode: https://www.typescriptlang.org/tsconfig#strict
- SCSS media queries: https://sass-lang.com/documentation/at-rules/media
- Responsive design: https://web.dev/responsive-web-design-basics/

---

### 🤖 Using Claude with This SKILL.md

**When asking Claude to code or review:**

1. **Reference the requirement:** "VP-03: Implement catalogue manager (SKILL.md §7.2–7.5)"
2. **Specify the component:** "Create catalogue-manager.component with responsive layout (SKILL.md §7.4)"
3. **Ask for review:** "Review my component against SKILL.md §5.1 (entity scope) and §7 (structure)"
4. **Request tests:** "Generate unit tests (min 80% coverage per SKILL.md §7.5)"

**Claude will:**
- ✅ Automatically reference this SKILL.md
- ✅ Trace features to requirement IDs
- ✅ Enforce entity scope
- ✅ Check audit logging
- ✅ Verify responsive design
- ✅ Ensure responsive breakpoints

---

### 📞 Common Questions

**Q: Do I need separate .ts and .html files for every component?**
A: YES. See SKILL.md §7.1 and §7.7. This is Angular standard and non-negotiable.

**Q: Should my component be responsive?**
A: YES. All components MUST be responsive (mobile → ultra-wide). See SKILL.md §7.4 & §7.6. Test at 375px, 768px, 1024px, 1440px.

**Q: How do I handle cross-entity data?**
A: NEVER access cross-entity data. Use SupplierEntityScope filter in BFF (SKILL.md §5.1 & §6.3).

**Q: Can I auto-post an invoice to the ledger?**
A: NO. CRITICAL ANTI-PATTERN. Invoice must be 'pending' until AP team manually posts. (SKILL.md §11)

**Q: What's the minimum test coverage?**
A: 80% code coverage. Unit tests required (SKILL.md §7.5 & §8.1).

**Q: How do I validate GSTIN/PAN?**
A: See SKILL.md §5.4 (validation rules) + §8.1 (test examples).

---

### 📈 Version Info

- **Version:** 1.1
- **Date:** 22 July 2026
- **Lines:** 2,371
- **Size:** 84 KB
- **Status:** ✅ CURRENT — see §13.1 for the latest engineering hardening notes

---

**This Quick Reference Guide helps you navigate the complete SKILL.md. For authoritative answers, always consult the full [`SKILL.md`](./SKILL.md) document.**
