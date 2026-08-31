import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "@ngx-translate/core";
import { ApiService } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";
import { ThemeService } from "../../services/theme.service";
import { LanguageSelectorComponent } from "../../components/language-selector/language-selector.component";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LanguageSelectorComponent],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.css",
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

  /** Set when the user landed here after being auto-logged-out for inactivity. */
  idleLogout = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService,
    private auth: AuthService,
    public theme: ThemeService,
  ) {
    this.idleLogout = this.route.snapshot.queryParamMap.get("reason") === "idle";
  }

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
