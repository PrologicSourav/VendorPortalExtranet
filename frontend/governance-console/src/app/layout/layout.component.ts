import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterOutlet, RouterLink, RouterLinkActive } from "@angular/router";
import { AuthTokenService } from "../services/auth-token.service";

@Component({
  selector: "app-gov-layout",
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: "./layout.component.html",
  styleUrl: "./layout.component.css",
})
export class LayoutComponent {
  auth = inject(AuthTokenService);
  // Launched inside WISH's Governance Console menu item as an iframe — WISH already
  // provides its own header/toolbar chrome, so this app's topbar would be redundant.
  isEmbedded = typeof window !== "undefined" && window.self !== window.top;
}
