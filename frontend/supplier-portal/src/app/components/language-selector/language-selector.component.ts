import { Component, inject } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "language-selector",
  standalone: true,
  imports: [],
  template: `
    <div class="language-selector">
      <select
        [value]="currentLanguage"
        (change)="changeLanguage($event)"
        class="lang-select"
      >
        <option value="en">English</option>
        <option value="ar">العربية (Arabic)</option>
        <option value="vi">Tiếng Việt (Vietnamese)</option>
        <option value="th">ไทย (Thai)</option>
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
        border-radius: 4px;
        border: 1px solid #ccc;
        background: white;
        font-size: 14px;
        cursor: pointer;
      }
    `,
  ],
})
export class LanguageSelectorComponent {
  private translate = inject(TranslateService);

  get currentLanguage(): string {
    return this.translate.currentLang() || "en";
  }

  changeLanguage(event: Event): void {
    const lang = (event.target as HTMLSelectElement).value;
    this.translate.use(lang);
    localStorage.setItem("wp_lang", lang);
  }
}
