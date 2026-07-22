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
  template: `
    <div class="language-selector">
      <select
        [ngModel]="currentLanguage"
        (ngModelChange)="changeLanguage($event)"
        class="lang-select"
        [attr.aria-label]="'Select language'"
      >
        @for (lang of languages; track lang.code) {
          <option [value]="lang.code">{{ lang.code.toUpperCase() }} {{ lang.label }}</option>
        }
      </select>
    </div>
  `,
  styles: [
    `
      .language-selector {
        display: flex;
        align-items: center;
      }
      .lang-select {
        padding: 6px 12px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.4);
        background: rgba(255, 255, 255, 0.12);
        color: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        min-height: 32px;
      }
      .lang-select:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .lang-select:focus-visible {
        outline: 2px solid white;
        outline-offset: 2px;
      }
      .lang-select option {
        color: #1b2a4a;
      }

      @media (max-width: 768px) {
        .lang-select {
          min-height: 44px;
          min-width: 44px;
        }
      }
    `,
  ],
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
