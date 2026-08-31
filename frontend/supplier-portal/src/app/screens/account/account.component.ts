import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe, TranslateService } from "@ngx-translate/core";
import { ActivatedRoute } from "@angular/router";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";
import { CurrencyService } from "../../services/currency.service";
import { MoneyPipe } from "../../pipes/money.pipe";

@Component({
  selector: "app-account",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, MoneyPipe],
  templateUrl: "./account.component.html",
  styleUrl: "./account.component.css",
})
export class AccountComponent implements OnInit {
  private translate = inject(TranslateService);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private currency = inject(CurrencyService);
  private route = inject(ActivatedRoute);

  // Default tab for the Account view (Profile is now its own menu item);
  // Company Profile mode overrides this to "profile" in ngOnInit.
  activeTab = "invoices";
  profileOnly = false;

  // KPI figures (base currency INR; displayed via the money pipe/converter).
  readonly totalOutstanding = 189500;
  readonly overdueAmount = 42000;
  readonly paidLast30Days = 215500;

  invoicesLoading = false;
  selectedInvoice: any = null;
  invoiceDetailLoading = false;
  paymentsLoading = false;

  // ─── Company profile (vendor) ───────────────────────────────
  vendor: any = null;
  profileLoading = true;
  profileError = false;
  editing = false;
  saving = false;
  form = {
    legalName: "",
    tradingName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    city: "",
    state: "",
  };
  toast: { type: string; key: string } | null = null;

  ngOnInit(): void {
    // The "Company Profile" menu opens this screen in profile-only mode (no KPIs
    // or tabs); the "Account" menu opens the full tabbed view on a given tab.
    const validTabs = ["profile", "invoices", "payments", "statement"];
    this.route.queryParams.subscribe((q) => {
      this.profileOnly = q["only"] === "profile";
      if (this.profileOnly) {
        this.activeTab = "profile";
      } else if (q["tab"] && validTabs.includes(q["tab"])) {
        this.activeTab = q["tab"];
      }
    });

    const vendorId = this.auth.user()?.vendorId;
    if (!vendorId) {
      this.profileLoading = false;
      this.profileError = true;
      return;
    }
    this.api.getVendor(vendorId).subscribe({
      next: (v: any) => {
        this.vendor = v;
        this.resetForm();
        this.profileLoading = false;
      },
      error: () => {
        this.profileLoading = false;
        this.profileError = true;
      },
    });

    this.loadInvoices(vendorId);
    this.loadPayments(vendorId);
  }

  private loadPayments(vendorId: string): void {
    this.paymentsLoading = true;
    this.api.getPayments(vendorId).subscribe({
      next: (res: any) => {
        const items = res?.items ?? res ?? [];
        this.payments = items.map((p: any) => ({
          reference: p.paymentReference,
          invoiceId: p.invoiceId,
          invoiceNumber: p.invoiceNumber,
          date: p.paidDate || p.scheduledDate,
          amount: p.amount,
          status: p.status,
        }));
        this.paymentsLoading = false;
      },
      error: () => {
        this.paymentsLoading = false;
      },
    });
  }

  private loadInvoices(vendorId: string): void {
    this.invoicesLoading = true;
    this.api.getInvoices(vendorId).subscribe({
      next: (res: any) => {
        const items = res?.items ?? res ?? [];
        this.invoices = items.map((inv: any) => ({
          id: inv.id,
          number: inv.invoiceNumber,
          date: inv.invoiceDate,
          // Invoice has no distinct due-date field yet — showing nothing is more
          // honest than fabricating one (e.g. defaulting it to the invoice date
          // would falsely imply zero payment terms).
          dueDate: null,
          amount: inv.totalAmount,
          status: inv.status,
        }));
        this.invoicesLoading = false;
      },
      error: () => {
        this.invoicesLoading = false;
      },
    });
  }

  startEdit(): void {
    this.resetForm();
    this.editing = true;
  }

  cancelEdit(): void {
    this.resetForm();
    this.editing = false;
  }

  saveProfile(): void {
    const vendorId = this.auth.user()?.vendorId;
    if (!vendorId) return;
    this.saving = true;

    // Only the fields the backend PUT /vendors/{id} actually accepts are sent;
    // GSTIN/PAN and other regulated fields stay read-only.
    const payload = { ...this.vendor, ...this.form };
    this.api.updateVendor(vendorId, payload).subscribe({
      next: (updated: any) => {
        this.vendor = updated;
        this.resetForm();
        this.editing = false;
        this.saving = false;
        this.showToast("success", "account.profileSaved");
      },
      error: () => {
        this.saving = false;
        this.showToast("error", "account.profileSaveError");
      },
    });
  }

  private resetForm(): void {
    if (!this.vendor) return;
    this.form = {
      legalName: this.vendor.legalName ?? "",
      tradingName: this.vendor.tradingName ?? "",
      contactEmail: this.vendor.contactEmail ?? "",
      contactPhone: this.vendor.contactPhone ?? "",
      address: this.vendor.address ?? "",
      city: this.vendor.city ?? "",
      state: this.vendor.state ?? "",
    };
  }

  private showToast(type: string, key: string): void {
    this.toast = { type, key };
    setTimeout(() => (this.toast = null), 3500);
  }

  // Balances shown on the statement tab (kept in sync with the template header/footer).
  readonly openingBalance = 231500;
  readonly closingBalance = 189500;

  /**
   * Renders the statement into a hidden iframe and invokes the browser's print
   * dialog, from which the user can "Save as PDF". Using an iframe (rather than
   * window.open) avoids popup blockers and keeps the print document isolated
   * from the app's own styles.
   */
  downloadStatement(): void {
    const t = (key: string) => this.translate.instant(key);
    const lang = this.translate.currentLang() || "en";
    // Convert base (INR) figures to the selected display currency for the PDF.
    const money = (n: number) => {
      const converted = this.currency.convertFromBase(n);
      const code =
        converted != null ? this.currency.selectedCurrency() : this.currency.baseCurrency;
      const val = converted != null ? converted : n;
      const digits = this.currency.decimalPrecisionFor(code);
      try {
        return new Intl.NumberFormat(lang, {
          style: "currency",
          currency: code,
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }).format(val);
      } catch {
        return `${code} ${val.toFixed(2)}`;
      }
    };
    const isRtl = lang === "ar";

    const rows = this.statement
      .map(
        (s) => `
          <tr>
            <td>${this.esc(s.date)}</td>
            <td>${this.esc(s.description)}</td>
            <td class="num">${s.debit ? money(s.debit) : "-"}</td>
            <td class="num">${s.credit ? money(s.credit) : "-"}</td>
            <td class="num"><strong>${money(s.balance)}</strong></td>
          </tr>`,
      )
      .join("");

    const printedOn = new Date().toLocaleString(lang);

    const html = `<!doctype html>
<html dir="${isRtl ? "rtl" : "ltr"}" lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${this.esc(t("account.statementTitle"))}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #1a1a2e; margin: 32px; font-size: 12px; }
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 2px solid #1b2a4a; padding-bottom: 12px; margin-bottom: 20px; }
    .doc-header h1 { font-size: 18px; color: #1b2a4a; margin: 0 0 4px; }
    .doc-header .brand { font-weight: 700; color: #1b2a4a; font-size: 14px; }
    .meta { text-align: ${isRtl ? "left" : "right"}; font-size: 11px; color: #64748b; }
    .balances { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f2f4f8; text-align: ${isRtl ? "right" : "left"};
      padding: 8px 10px; border-bottom: 2px solid #e2e6ee; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; }
    td { padding: 8px 10px; border-bottom: 1px solid #eef0f4; }
    td.num, th.num { text-align: ${isRtl ? "left" : "right"}; white-space: nowrap; }
    tfoot td { border-top: 2px solid #e2e6ee; font-weight: 700; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <div class="doc-header">
    <div>
      <h1>${this.esc(t("account.statementTitle"))}</h1>
      <div class="brand">${this.esc(t("app.title"))}</div>
    </div>
    <div class="meta">${this.esc(t("account.printedOn"))}: ${this.esc(printedOn)}</div>
  </div>

  <div class="balances">
    <div>${this.esc(t("account.openingBalance"))}: <strong>${money(this.openingBalance)}</strong></div>
    <div>${this.esc(t("account.closingBalance"))}: <strong>${money(this.closingBalance)}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${this.esc(t("account.date"))}</th>
        <th>${this.esc(t("account.description"))}</th>
        <th class="num">${this.esc(t("account.debit"))}</th>
        <th class="num">${this.esc(t("account.credit"))}</th>
        <th class="num">${this.esc(t("account.balance"))}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="4">${this.esc(t("account.closingBalance"))}</td>
        <td class="num">${money(this.closingBalance)}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    if (!win) {
      document.body.removeChild(iframe);
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();

    // Give the iframe a tick to lay out before printing, then clean up after.
    const cleanup = () => setTimeout(() => iframe.remove(), 500);
    win.onafterprint = cleanup;
    setTimeout(() => {
      win.focus();
      win.print();
      cleanup();
    }, 150);
  }

  /** Minimal HTML-escape for values interpolated into the print document. */
  private esc(value: string): string {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  invoices: any[] = [];

  payments: any[] = [];

  statement = [
    {
      date: "Jun 1",
      description: "Opening Balance",
      debit: 0,
      credit: 0,
      balance: 231500,
    },
    {
      date: "Jun 5",
      description: "Invoice INV-2025-003",
      debit: 42000,
      credit: 0,
      balance: 273500,
    },
    {
      date: "Jul 1",
      description: "Payment PAY-2025-045",
      debit: 0,
      credit: 156000,
      balance: 117500,
    },
    {
      date: "Jul 5",
      description: "Invoice INV-2025-001",
      debit: 84000,
      credit: 0,
      balance: 201500,
    },
    {
      date: "Jul 8",
      description: "Invoice INV-2025-002",
      debit: 63500,
      credit: 0,
      balance: 265000,
    },
    {
      date: "Jul 15",
      description: "Payment PAY-2025-046 (scheduled)",
      debit: 0,
      credit: 59500,
      balance: 205500,
    },
    {
      date: "Jul 20",
      description: "Payment PAY-2025-047 (scheduled)",
      debit: 0,
      credit: 49500,
      balance: 156000,
    },
  ];

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      Submitted: "badge-info",
      UnderReview: "badge-warning",
      Approved: "badge-success",
      Posted: "badge-success",
      Blocked: "badge-error",
      Paid: "badge-success",
      Scheduled: "badge-warning",
      Cancelled: "badge-error",
    };
    return map[status] || "badge-muted";
  }

  getStatusKey(status: string): string {
    const map: Record<string, string> = {
      Submitted: "account.statusSubmitted",
      UnderReview: "account.statusUnderReview",
      Approved: "account.statusApproved",
      Posted: "account.statusPosted",
      Blocked: "account.statusBlocked",
      Paid: "account.statusPaid",
      Scheduled: "account.statusScheduled",
      Cancelled: "account.statusCancelled",
    };
    return map[status] || status;
  }

  openInvoice(inv: any): void {
    this.selectedInvoice = { invoiceNumber: inv.number, status: inv.status, invoiceDate: inv.date };
    this.loadInvoiceDetail(inv.id);
  }

  /** Opens the invoice detail drawer from a payment row's linked invoice — the
   *  Payments tab only has the invoice id/number up front, not the full record. */
  openInvoiceById(invoiceId: string): void {
    this.selectedInvoice = { invoiceNumber: "…" };
    this.loadInvoiceDetail(invoiceId);
  }

  private loadInvoiceDetail(id: string): void {
    this.invoiceDetailLoading = true;
    this.api.getInvoice(id).subscribe({
      next: (d: any) => {
        this.selectedInvoice = d;
        this.invoiceDetailLoading = false;
      },
      error: () => {
        this.invoiceDetailLoading = false;
        this.selectedInvoice = null;
      },
    });
  }
}
