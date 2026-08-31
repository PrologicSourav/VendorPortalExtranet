import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TranslateService } from "@ngx-translate/core";

interface LanguageOption {
  code: string;
  label: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "th", label: "ไทย" },
];

@Component({
  selector: "language-selector",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./language-selector.component.html",
  styleUrl: "./language-selector.component.css",
})
export class LanguageSelectorComponent {
  private translate = inject(TranslateService);
  languages = LANGUAGES;

  get currentLanguage(): string {
    return this.translate.currentLang() || "en";
  }

  changeLanguage(lang: string): void {
    this.translate.use(lang);
    localStorage.setItem("wp_lang", lang);
  }
}
