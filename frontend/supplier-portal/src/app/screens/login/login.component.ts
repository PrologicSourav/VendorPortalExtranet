import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "@ngx-translate/core";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="brand">
          <div class="brand-icon">WP</div>
          <h1>Web Prol'IFIC</h1>
          <p class="brand-sub">Prologic First</p>
        </div>

        <!-- Step 1: Credentials -->
        @if (step === 1) {
          <div class="login-form">
            <h2>{{ "login.title" | translate }}</h2>

            <div class="form-group">
              <label>{{ "login.email" | translate }}</label>
              <input
                type="email"
                class="form-control"
                [(ngModel)]="email"
                placeholder="you@company.com"
                [class.error]="showError"
              />
            </div>

            <div class="form-group">
              <label>{{ "login.password" | translate }}</label>
              <input
                type="password"
                class="form-control"
                [(ngModel)]="password"
                placeholder="••••••••"
                [class.error]="showError"
                (keyup.enter)="handleLogin()"
              />
            </div>

            @if (showError) {
              <div class="error-msg">
                {{ "login.invalidCredentials" | translate }}
              </div>
            }

            <div class="form-row">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="rememberMe" />
                {{ "login.rememberMe" | translate }}
              </label>
              <a
                href="javascript:void(0)"
                class="forgot-link"
                (click)="step = 3"
                >{{ "login.forgotPassword" | translate }}</a
              >
            </div>

            <button
              class="btn btn-primary btn-block"
              (click)="handleLogin()"
              [disabled]="loading"
            >
              {{
                loading
                  ? ("login.signingIn" | translate)
                  : ("login.signIn" | translate)
              }}
            </button>

            <div class="signup-row">
              <span>{{ "login.noAccount" | translate }}</span>
              <a
                href="javascript:void(0)"
                class="signup-link"
                (click)="step = 4"
                >{{ "login.register" | translate }}</a
              >
            </div>
          </div>
        }

        <!-- Step 2: MFA OTP -->
        @if (step === 2) {
          <div class="login-form">
            <h2>{{ "login.mfaTitle" | translate }}</h2>
            <p class="otp-hint">{{ "login.mfaHint" | translate }}</p>

            <div class="otp-inputs">
              @for (i of [0, 1, 2, 3, 4, 5]; track i; let idx = $index) {
                <input
                  type="text"
                  maxlength="1"
                  class="otp-input"
                  [id]="'otp-' + idx"
                  (input)="onOtpInput($event, idx)"
                  (keydown)="onOtpKeydown($event, idx)"
                />
              }
            </div>

            <button
              class="btn btn-primary btn-block"
              (click)="handleOtp()"
              [disabled]="loading || otp.length !== 6"
            >
              {{
                loading
                  ? ("login.verifying" | translate)
                  : ("login.verifyOtp" | translate)
              }}
            </button>

            <button
              class="btn btn-secondary btn-block"
              (click)="step = 1"
              style="margin-top: 8px"
            >
              {{ "login.backToLogin" | translate }}
            </button>
          </div>
        }

        <!-- Step 3: Forgot Password -->
        @if (step === 3) {
          <div class="login-form">
            <h2>{{ "login.resetPassword" | translate }}</h2>

            @if (!resetSent) {
              <div>
                <p class="otp-hint">{{ "login.resetHint" | translate }}</p>

                <div class="form-group">
                  <label>{{ "login.email" | translate }}</label>
                  <input
                    type="email"
                    class="form-control"
                    [(ngModel)]="resetEmail"
                    placeholder="you@company.com"
                  />
                </div>

                @if (showError) {
                  <div class="error-msg">
                    {{ errorMsg || ("login.somethingWentWrong" | translate) }}
                  </div>
                }

                <button
                  class="btn btn-primary btn-block"
                  (click)="handleForgotPassword()"
                  [disabled]="loading || !resetEmail"
                >
                  {{
                    loading
                      ? ("login.sending" | translate)
                      : ("login.sendResetLink" | translate)
                  }}
                </button>
              </div>
            }

            @if (resetSent) {
              <div class="reset-success">
                <div class="success-icon">✉️</div>
                <p class="success-msg">
                  {{ "login.resetSentMsg" | translate }}
                </p>
                <p class="success-hint">
                  {{ "login.resetSentHint" | translate }}
                </p>
              </div>
            }

            <button
              class="btn btn-secondary btn-block"
              (click)="step = 1"
              style="margin-top: 8px"
            >
              {{ "login.backToLogin" | translate }}
            </button>
          </div>
        }

        <!-- Step 4: Sign Up / Register -->
        @if (step === 4) {
          <div class="login-form">
            <h2>{{ "login.registerTitle" | translate }}</h2>

            @if (!signupSuccess) {
              <div>
                <p class="otp-hint">{{ "login.registerHint" | translate }}</p>

                <div class="form-group">
                  <label>{{ "login.companyName" | translate }}</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="signupCompany"
                    [placeholder]="'login.companyNamePlaceholder' | translate"
                  />
                </div>

                <div class="form-group">
                  <label>{{ "login.contactName" | translate }}</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="signupName"
                    [placeholder]="'login.contactNamePlaceholder' | translate"
                  />
                </div>

                <div class="form-group">
                  <label>{{ "login.email" | translate }}</label>
                  <input
                    type="email"
                    class="form-control"
                    [(ngModel)]="signupEmail"
                    placeholder="you@company.com"
                    [class.error]="showError"
                  />
                </div>

                <div class="form-group">
                  <label>{{ "login.password" | translate }}</label>
                  <input
                    type="password"
                    class="form-control"
                    [(ngModel)]="signupPassword"
                    [placeholder]="'login.passwordPlaceholder' | translate"
                    [class.error]="showError"
                  />
                </div>

                <div class="form-group">
                  <label>{{ "login.gstin" | translate }}</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="signupGstin"
                    placeholder="22AAAAA0000A1Z5"
                    maxlength="15"
                  />
                </div>

                @if (showError) {
                  <div class="error-msg">
                    {{ errorMsg || ("login.registrationFailed" | translate) }}
                  </div>
                }

                <button
                  class="btn btn-primary btn-block"
                  (click)="handleSignup()"
                  [disabled]="loading"
                >
                  {{
                    loading
                      ? ("login.creatingAccount" | translate)
                      : ("login.createAccount" | translate)
                  }}
                </button>
              </div>
            }

            @if (signupSuccess) {
              <div class="reset-success">
                <div class="success-icon">✅</div>
                <p class="success-msg">
                  {{ "login.accountCreated" | translate }}
                </p>
                <p class="success-hint">
                  {{ "login.accountCreatedHint" | translate }}
                </p>
              </div>
            }

            <button
              class="btn btn-secondary btn-block"
              (click)="step = 1"
              style="margin-top: 8px"
            >
              {{ "login.backToLogin" | translate }}
            </button>
          </div>
        }

        <div class="login-footer">
          {{ "login.footer" | translate }}
          <a href="#">{{ "login.staffConsole" | translate }}</a
          >.
        </div>
      </div>

      <div class="powered-by">Powered by Prologic First</div>
    </div>
  `,
  styles: [
    `
      .login-page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(
          135deg,
          #0f1a2e 0%,
          #1b2a4a 50%,
          #2c3e6b 100%
        );
        padding: 20px;
      }
      .login-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        width: 100%;
        max-width: 420px;
        padding: 40px;
      }
      .brand {
        text-align: center;
        margin-bottom: 32px;
      }
      .brand-icon {
        width: 60px;
        height: 60px;
        background: var(--color-primary);
        color: white;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: 800;
        margin-bottom: 12px;
      }
      .brand h1 {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-primary);
      }
      .brand-sub {
        font-size: 12px;
        color: var(--color-text-muted);
        margin-top: 2px;
      }
      .login-form h2 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 20px;
      }
      .error-msg {
        background: #fef2f2;
        color: #991b1b;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        margin-bottom: 12px;
        border: 1px solid #fecaca;
      }
      .form-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .forgot-link {
        font-size: 13px;
      }
      .btn-block {
        width: 100%;
        padding: 10px;
      }
      .otp-hint {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-bottom: 20px;
      }
      .signup-row {
        text-align: center;
        margin-top: 16px;
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .signup-link {
        font-weight: 600;
        margin-left: 4px;
      }
      .reset-success {
        text-align: center;
        padding: 16px 0;
      }
      .success-icon {
        font-size: 36px;
        margin-bottom: 12px;
      }
      .success-msg {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-primary, #1a1a2e);
        margin-bottom: 6px;
      }
      .success-hint {
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .otp-inputs {
        display: flex;
        gap: 8px;
        justify-content: center;
        margin-bottom: 20px;
      }
      .otp-input {
        width: 44px;
        height: 52px;
        text-align: center;
        font-size: 20px;
        font-weight: 600;
        border: 2px solid var(--color-border);
        border-radius: 8px;
        transition: border-color 0.15s;
        &:focus {
          outline: none;
          border-color: var(--color-primary);
        }
      }
      .login-footer {
        margin-top: 24px;
        text-align: center;
        font-size: 12px;
        color: var(--color-text-muted);
      }
      .powered-by {
        margin-top: 20px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
      }

      @media (max-width: 768px) {
        .login-card {
          padding: 28px 24px;
          max-width: 100%;
          margin: 0 10px;
          width: calc(100% - 20px);
        }
        .login-page {
          padding: 12px;
          justify-content: flex-start;
          padding-top: 60px;
        }
        .brand {
          margin-bottom: 24px;
        }
        .brand h1 {
          font-size: 18px;
        }
        .brand-icon {
          width: 48px;
          height: 48px;
          font-size: 16px;
        }
        .otp-inputs {
          gap: 6px;
        }
        .otp-input {
          width: 38px;
          height: 46px;
          font-size: 18px;
        }
        .form-row {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
      }

      @media (max-width: 480px) {
        .login-card {
          padding: 20px 16px;
        }
        .otp-input {
          width: 32px;
          height: 40px;
          font-size: 16px;
        }
        .otp-inputs {
          gap: 4px;
        }
      }
    `,
  ],
})
export class LoginComponent {
  step = 1;
  email = "";
  password = "";
  rememberMe = false;
  otp = "";
  loading = false;
  showError = false;
  errorMsg = "";

  // Forgot password
  resetEmail = "";
  resetSent = false;

  // Sign up
  signupCompany = "";
  signupName = "";
  signupEmail = "";
  signupPassword = "";
  signupGstin = "";
  signupSuccess = false;

  constructor(
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
  ) {}

  handleLogin() {
    this.loading = true;
    this.showError = false;
    this.errorMsg = "";

    this.api.login(this.email, this.password).subscribe({
      next: (res) => {
        // Store the full response for use after OTP
        this._loginResponse = res;
        this.step = 2;
        this.loading = false;
      },
      error: (err) => {
        this.showError = true;
        this.errorMsg =
          err?.error?.error || "Invalid credentials. Please try again.";
        this.loading = false;
      },
    });
  }

  private _loginResponse: any = null;

  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    this.otp =
      this.otp.substring(0, index) +
      input.value +
      this.otp.substring(index + 1);
    if (input.value && index < 5) {
      document.getElementById("otp-" + (index + 1))?.focus();
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number) {
    if (event.key === "Backspace" && index > 0) {
      this.otp = this.otp.substring(0, index) + this.otp.substring(index);
      document.getElementById("otp-" + (index - 1))?.focus();
    }
  }

  handleOtp() {
    this.loading = true;
    this.showError = false;
    this.errorMsg = "";
    this.api.verifyOtp(this.otp).subscribe({
      next: () => {
        if (this._loginResponse) {
          const u = this._loginResponse.user;
          const token = this._loginResponse.token;
          this.auth.login(
            {
              id: u.id,
              email: u.email,
              displayName: u.displayName,
              role: u.role,
              isInternal: u.isInternal,
              vendorId: u.vendorId,
            },
            token,
          );
        }
        this.router.navigate(["/dashboard"]);
      },
      error: () => {
        this.loading = false;
        this.showError = true;
        this.errorMsg = "Invalid OTP. Please try again.";
      },
    });
  }

  handleForgotPassword() {
    this.loading = true;
    this.showError = false;
    this.errorMsg = "";
    this.api.forgotPassword(this.resetEmail).subscribe({
      next: () => {
        this.resetSent = true;
        this.loading = false;
      },
      error: (err) => {
        this.showError = true;
        this.errorMsg =
          err?.error?.error || "Something went wrong. Please try again.";
        this.loading = false;
      },
    });
  }

  handleSignup() {
    this.loading = true;
    this.showError = false;
    this.errorMsg = "";
    this.api
      .register({
        email: this.signupEmail,
        password: this.signupPassword,
        companyName: this.signupCompany,
        displayName: this.signupName || undefined,
        gstin: this.signupGstin || undefined,
      })
      .subscribe({
        next: () => {
          this.signupSuccess = true;
          this.loading = false;
        },
        error: (err) => {
          this.showError = true;
          this.errorMsg =
            err?.error?.error || "Registration failed. Please try again.";
          this.loading = false;
        },
      });
  }
}
