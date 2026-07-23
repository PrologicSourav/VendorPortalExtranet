import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TranslatePipe, TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-account",
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="page-header">
      <h1>{{ "account.title" | translate }}</h1>
      <p class="page-subtitle">{{ "account.subtitle" | translate }}</p>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">{{ "account.totalOutstanding" | translate }}</div>
        <div class="kpi-value">₹1,89,500</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">{{ "account.overdueAmount" | translate }}</div>
        <div class="kpi-value" style="color: var(--color-error)">₹42,000</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">{{ "account.paidLast30Days" | translate }}</div>
        <div class="kpi-value" style="color: var(--color-success)">
          ₹2,15,500
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <div
        class="tab"
        [class.active]="activeTab === 'invoices'"
        (click)="activeTab = 'invoices'"
      >
        {{ "account.tabOutstandingInvoices" | translate }}
      </div>
      <div
        class="tab"
        [class.active]="activeTab === 'payments'"
        (click)="activeTab = 'payments'"
      >
        {{ "account.tabPayments" | translate }}
      </div>
      <div
        class="tab"
        [class.active]="activeTab === 'statement'"
        (click)="activeTab = 'statement'"
      >
        {{ "account.tabStatement" | translate }}
      </div>
    </div>

    <!-- Outstanding Invoices -->
    <div
      *ngIf="activeTab === 'invoices'"
      class="card"
      style="border-top: none; border-radius: 0 0 8px 8px"
    >
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ "account.invoiceNo" | translate }}</th>
              <th>{{ "account.date" | translate }}</th>
              <th>{{ "account.dueDate" | translate }}</th>
              <th>{{ "account.amount" | translate }}</th>
              <th>{{ "account.status" | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let inv of invoices">
              <td>
                <code>{{ inv.number }}</code>
              </td>
              <td>{{ inv.date }}</td>
              <td>{{ inv.dueDate }}</td>
              <td>₹{{ inv.amount | number }}</td>
              <td>
                <span class="badge" [ngClass]="getStatusBadge(inv.status)">{{
                  getStatusKey(inv.status) | translate
                }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Payments -->
    <div
      *ngIf="activeTab === 'payments'"
      class="card"
      style="border-top: none; border-radius: 0 0 8px 8px"
    >
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ "account.reference" | translate }}</th>
              <th>{{ "account.date" | translate }}</th>
              <th>{{ "account.amount" | translate }}</th>
              <th>{{ "account.status" | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of payments">
              <td>
                <code>{{ p.reference }}</code>
              </td>
              <td>{{ p.date }}</td>
              <td>₹{{ p.amount | number }}</td>
              <td>
                <span
                  class="badge"
                  [ngClass]="
                    p.status === 'Paid' ? 'badge-success' : 'badge-info'
                  "
                  >{{ getStatusKey(p.status) | translate }}</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Statement -->
    <div
      *ngIf="activeTab === 'statement'"
      class="card"
      style="border-top: none; border-radius: 0 0 8px 8px"
    >
      <div class="card-body">
        <div class="statement-header">
          <div>
            {{ "account.openingBalance" | translate }}: <strong>₹2,31,500</strong>
          </div>
          <button class="btn btn-secondary" (click)="downloadStatement()">
            📥 {{ "account.downloadPdf" | translate }}
          </button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ "account.date" | translate }}</th>
              <th>{{ "account.description" | translate }}</th>
              <th>{{ "account.debit" | translate }}</th>
              <th>{{ "account.credit" | translate }}</th>
              <th>{{ "account.balance" | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of statement">
              <td>{{ s.date }}</td>
              <td>{{ s.description }}</td>
              <td>{{ s.debit ? "₹" + (s.debit | number) : "-" }}</td>
              <td>{{ s.credit ? "₹" + (s.credit | number) : "-" }}</td>
              <td>
                <strong>₹{{ s.balance | number }}</strong>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="statement-footer">
          {{ "account.closingBalance" | translate }}: <strong>₹1,89,500</strong>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        margin-bottom: 20px;
      }
      .page-header h1 {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-heading);
      }
      .page-subtitle {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-top: 4px;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }
      code {
        background: var(--color-surface-alt);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
      }
      .statement-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        font-size: 14px;
      }
      .table-wrap {
        overflow-x: auto;
      }
      .statement-footer {
        text-align: right;
        padding-top: 12px;
        font-size: 14px;
        border-top: 1px solid var(--color-border);
      }

      @media (max-width: 640px) {
        .tabs {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          &::-webkit-scrollbar {
            display: none;
          }
          .tab {
            white-space: nowrap;
            padding: 10px 14px;
            font-size: 12px;
          }
        }
        .statement-footer {
          text-align: left;
        }
      }

      @media (max-width: 1024px) {
        .kpi-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 640px) {
        .kpi-grid {
          grid-template-columns: 1fr;
        }
        .statement-header {
          flex-direction: column;
          gap: 12px;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class AccountComponent {
  private translate = inject(TranslateService);

  activeTab = "invoices";

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
    const money = (n: number) => "₹" + n.toLocaleString("en-IN");
    const lang = this.translate.currentLang() || "en";
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

  invoices = [
    {
      number: "INV-2025-001",
      date: "Jul 5",
      dueDate: "Aug 4",
      amount: 84000,
      status: "Submitted",
    },
    {
      number: "INV-2025-002",
      date: "Jul 8",
      dueDate: "Aug 7",
      amount: 63500,
      status: "Under review",
    },
    {
      number: "INV-2025-003",
      date: "Jun 20",
      dueDate: "Jul 20",
      amount: 42000,
      status: "Blocked",
    },
  ];

  payments = [
    {
      reference: "PAY-2025-045",
      date: "Jul 1",
      amount: 156000,
      status: "Paid",
    },
    {
      reference: "PAY-2025-046",
      date: "Jul 15",
      amount: 59500,
      status: "Scheduled",
    },
    {
      reference: "PAY-2025-047",
      date: "Jul 20",
      amount: 49500,
      status: "Scheduled",
    },
  ];

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
      "Under review": "badge-warning",
      Approved: "badge-success",
      Blocked: "badge-error",
    };
    return map[status] || "badge-muted";
  }

  getStatusKey(status: string): string {
    const map: Record<string, string> = {
      Submitted: "account.statusSubmitted",
      "Under review": "account.statusUnderReview",
      Approved: "account.statusApproved",
      Blocked: "account.statusBlocked",
      Paid: "account.statusPaid",
      Scheduled: "account.statusScheduled",
    };
    return map[status] || status;
  }
}
