import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="brand">
          <div class="brand-icon">WP</div>
          <h1>Web Prol'IFIC</h1>
          <p class="brand-sub">Prologic First</p>
        </div>

        <!-- Step 1: Credentials -->
        <div *ngIf="step === 1" class="login-form">
          <h2>Sign in to Supplier Portal</h2>

          <div class="form-group">
            <label>Email address</label>
            <input
              type="email"
              class="form-control"
              [(ngModel)]="email"
              placeholder="you@company.com"
              [class.error]="showError"
            />
          </div>

          <div class="form-group">
            <label>Password</label>
            <input
              type="password"
              class="form-control"
              [(ngModel)]="password"
              placeholder="••••••••"
              [class.error]="showError"
              (keyup.enter)="handleLogin()"
            />
          </div>

          <div *ngIf="showError" class="error-msg">
            Invalid credentials. Please try again.
          </div>

          <div class="form-row">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="rememberMe" /> Remember me
            </label>
            <a href="javascript:void(0)" class="forgot-link" (click)="step = 3"
              >Forgot password?</a
            >
          </div>

          <button
            class="btn btn-primary btn-block"
            (click)="handleLogin()"
            [disabled]="loading"
          >
            {{ loading ? "Signing in..." : "Sign in" }}
          </button>

          <div class="signup-row">
            <span>Don't have an account?</span>
            <a href="javascript:void(0)" class="signup-link" (click)="step = 4"
              >Register</a
            >
          </div>
        </div>

        <!-- Step 2: MFA OTP -->
        <div *ngIf="step === 2" class="login-form">
          <h2>Two-Factor Authentication</h2>
          <p class="otp-hint">Enter the 6-digit code sent to your email</p>

          <div class="otp-inputs">
            <input
              *ngFor="let i of [0, 1, 2, 3, 4, 5]; let idx = index"
              type="text"
              maxlength="1"
              class="otp-input"
              [id]="'otp-' + idx"
              (input)="onOtpInput($event, idx)"
              (keydown)="onOtpKeydown($event, idx)"
            />
          </div>

          <button
            class="btn btn-primary btn-block"
            (click)="handleOtp()"
            [disabled]="loading || otp.length !== 6"
          >
            {{ loading ? "Verifying..." : "Verify OTP" }}
          </button>

          <button
            class="btn btn-secondary btn-block"
            (click)="step = 1"
            style="margin-top: 8px"
          >
            Back to login
          </button>
        </div>

        <!-- Step 3: Forgot Password -->
        <div *ngIf="step === 3" class="login-form">
          <h2>Reset Password</h2>

          <div *ngIf="!resetSent">
            <p class="otp-hint">
              Enter your email and we'll send you a link to reset your password.
            </p>

            <div class="form-group">
              <label>Email address</label>
              <input
                type="email"
                class="form-control"
                [(ngModel)]="resetEmail"
                placeholder="you@company.com"
              />
            </div>

            <div *ngIf="showError" class="error-msg">
              {{ errorMsg || "Something went wrong. Please try again." }}
            </div>

            <button
              class="btn btn-primary btn-block"
              (click)="handleForgotPassword()"
              [disabled]="loading || !resetEmail"
            >
              {{ loading ? "Sending..." : "Send Reset Link" }}
            </button>
          </div>

          <div *ngIf="resetSent" class="reset-success">
            <div class="success-icon">✉️</div>
            <p class="success-msg">
              If an account exists with that email, a password reset link has
              been sent.
            </p>
            <p class="success-hint">
              Please check your inbox and follow the instructions.
            </p>
          </div>

          <button
            class="btn btn-secondary btn-block"
            (click)="step = 1"
            style="margin-top: 8px"
          >
            Back to login
          </button>
        </div>

        <!-- Step 4: Sign Up / Register
        <div *ngIf="step === 4" class="login-form">
          <h2>Register</h2>

          <div *ngIf="!signupSuccess">
            <p class="otp-hint">
              Create a supplier portal account to get started.
            </p>

            <div class="form-group">
              <label>Company Name</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="signupCompany"
                placeholder="Your company name"
              />
            </div>

            <div class="form-group">
              <label>Contact Name</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="signupName"
                placeholder="Your full name"
              />
            </div>

            <div class="form-group">
              <label>Email address</label>
              <input
                type="email"
                class="form-control"
                [(ngModel)]="signupEmail"
                placeholder="you@company.com"
                [class.error]="showError"
              />
            </div>

            <div class="form-group">
              <label>Password</label>
              <input
                type="password"
                class="form-control"
                [(ngModel)]="signupPassword"
                placeholder="Min. 6 characters"
                [class.error]="showError"
              />
            </div>

            <div class="form-group">
              <label>GSTIN (optional)</label>
              <input
                type="text"
                class="form-control"
                [(ngModel)]="signupGstin"
                placeholder="22AAAAA0000A1Z5"
                maxlength="15"
              />
            </div>

            <div *ngIf="showError" class="error-msg">
              {{ errorMsg || "Registration failed. Please try again." }}
            </div>

            <button
              class="btn btn-primary btn-block"
              (click)="handleSignup()"
              [disabled]="loading"
            >
              {{ loading ? "Creating account..." : "Create Account" }}
            </button>
          </div>

          <div *ngIf="signupSuccess" class="reset-success">
            <div class="success-icon">✅</div>
            <p class="success-msg">Account created successfully!</p>
            <p class="success-hint">
              You can now sign in with your email and password.
            </p>
          </div>

          <button
            class="btn btn-secondary btn-block"
            (click)="step = 1"
            style="margin-top: 8px"
          >
            Back to login
          </button>
        </div>

        <div class="login-footer">
          Supplier access portal. For Web Prol'IFIC internal staff, use the
          <a href="#">staff console</a>.
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
