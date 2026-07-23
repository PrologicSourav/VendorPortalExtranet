import { Component, inject, OnInit } from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { RouterOutlet } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { ThemeService } from "./services/theme.service";

const LANG_STORAGE_KEY = "wp_lang";
const RTL_LANGUAGES = ["ar"];

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit {
  private translate = inject(TranslateService);
  private document = inject(DOCUMENT);
  // Instantiated for its side effect: applies the saved (or OS-preferred) theme
  // to <html> at startup, before any screen renders.
  private theme = inject(ThemeService);

  ngOnInit(): void {
    // Restore the user's saved language (previously written but never read back).
    const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
    const initialLang = savedLang ?? this.translate.currentLang() ?? "en";
    this.translate.use(initialLang);
    this.applyDirection(initialLang);

    this.translate.onLangChange.subscribe(({ lang }) => this.applyDirection(lang));
  }

  private applyDirection(lang: string): void {
    const dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";
    this.document.documentElement.dir = dir;
    this.document.documentElement.lang = lang;
  }
}
