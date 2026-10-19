
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Municipality {
  id: number;
  code: string;
  nameBn: string;
  nameEn: string;
  addressText?: string;
  telephone?: string;
  email?: string;
  website?: string;
  formLanguage: string;
  isActive: boolean;
}

@Component({
  selector: 'app-municipality-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1>Municipality Management</h1>
          <p>Create and manage municipalities</p>
        </div>
        <button type="button" class="primary" (click)="loadMunicipalities()">
          Refresh List
        </button>
      </div>

      <div class="card">
        <h2>Create New Municipality</h2>

        <form #municipalityForm="ngForm"
              (ngSubmit)="createMunicipality(municipalityForm)">

          <div class="form-grid">
            <label>
              Municipality Code *
              <input name="code" [(ngModel)]="form.code"
                     required maxlength="50"
                     pattern="[A-Za-z0-9_-]+"
                     placeholder="e.g. RANGPUR_CITY">
            </label>

            <label>
              Municipality Name (Bangla) *
              <input name="nameBn" [(ngModel)]="form.nameBn"
                     required maxlength="255"
                     placeholder="পৌরসভা বা সিটি কর্পোরেশনের নাম">
            </label>

            <label>
              Municipality Name (English) *
              <input name="nameEn" [(ngModel)]="form.nameEn"
                     required maxlength="255"
                     placeholder="Municipality Name">
            </label>

            <label>
              Telephone
              <input name="telephone" [(ngModel)]="form.telephone"
                     maxlength="30" placeholder="Telephone number">
            </label>

            <label>
              Email
              <input type="email" name="email" [(ngModel)]="form.email"
                     maxlength="150" placeholder="official@example.com">
            </label>

            <label>
              Website
              <input type="url" name="website" [(ngModel)]="form.website"
                     maxlength="255" placeholder="https://example.com">
            </label>

            <label>
              Form Language *
              <select name="formLanguage" [(ngModel)]="form.formLanguage"
                      required>
                <option value="BN">Bangla (BN)</option>
                <option value="EN">English (EN)</option>
              </select>
            </label>

            <label class="full">
              Address
              <textarea name="addressText" [(ngModel)]="form.addressText"
                        rows="3" placeholder="Full address"></textarea>
            </label>
          </div>

          <div class="actions">
            <button type="submit" class="primary"
                    [disabled]="municipalityForm.invalid || saving">
              {{ saving ? 'Saving...' : 'Create Municipality' }}
            </button>

            <button type="button" class="secondary"
                    (click)="resetForm(municipalityForm)">
              Clear
            </button>
          </div>
        </form>

        <p *ngIf="message" class="message" [class.error]="isError">
          {{ message }}
        </p>
      </div>

      <div class="card">
        <div class="list-header">
          <h2>Municipality List</h2>
          <span>Total: {{ municipalities.length }}</span>
        </div>

        <p *ngIf="loading">Loading municipalities...</p>

        <div class="table-wrap" *ngIf="!loading">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Code</th>
                <th>Name (Bangla)</th>
                <th>Name (English)</th>
                <th>Telephone</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr *ngFor="let m of municipalities">
                <td>{{ m.id }}</td>
                <td>{{ m.code }}</td>
                <td>{{ m.nameBn }}</td>
                <td>{{ m.nameEn }}</td>
                <td>{{ m.telephone || '-' }}</td>
                <td>{{ m.email || '-' }}</td>
                <td>
                  <span [class.active]="m.isActive"
                        [class.inactive]="!m.isActive">
                    {{ m.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
              </tr>

              <tr *ngIf="municipalities.length === 0">
                <td colspan="7" class="empty">
                  No municipalities found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; color: var(--text-color, #243047); }
    .page { max-width: 1400px; margin: auto; padding: 24px; }
    .page-header, .list-header {
      display: flex; justify-content: space-between;
      align-items: center; gap: 16px; flex-wrap: wrap;
    }
    h1 { margin: 0 0 8px; font-size: 26px; }
    h2 { margin: 0 0 20px; font-size: 19px; }
    p { color: #64748b; }
    .card {
      background: var(--card-background, #fff);
      border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 24px; margin-top: 24px;
    }
    .form-grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    label { display: flex; flex-direction: column; gap: 7px; font-size: 14px; }
    input, select, textarea {
      width: 100%; box-sizing: border-box; padding: 11px 12px;
      border: 1px solid #cbd5e1; border-radius: 7px;
      font: inherit; background: white; color: #243047;
    }
    input:focus, select:focus, textarea:focus {
      outline: 2px solid #93c5fd; border-color: #2563eb;
    }
    .full { grid-column: 1 / -1; }
    .actions { display: flex; gap: 10px; margin-top: 22px; }
    button {
      padding: 11px 16px; border: 0; border-radius: 7px;
      cursor: pointer; font-weight: 600;
    }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .primary { background: #1d4ed8; color: white; }
    .secondary { background: #e2e8f0; color: #243047; }
    .table-wrap { overflow-x: auto; margin-top: 18px; }
    table { border-collapse: collapse; width: 100%; min-width: 800px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-size: 13px; }
    .active, .inactive { font-weight: 600; }
    .active { color: #15803d; }
    .inactive { color: #b91c1c; }
    .message { margin-top: 18px; color: #15803d; }
    .message.error { color: #b91c1c; }
    .empty { text-align: center; color: #64748b; }
    @media (max-width: 700px) {
      .page { padding: 12px; }
      .card { padding: 16px; }
      .form-grid { grid-template-columns: 1fr; }
      .full { grid-column: auto; }
    }
  `]
})
export class MunicipalityManagementComponent implements OnInit {
  private http = inject(HttpClient);

  private readonly apiUrl = '/api/v1/platform/municipalities';

  municipalities: Municipality[] = [];
  saving = false;
  loading = false;
  message = '';
  isError = false;

  form = this.emptyForm();

  ngOnInit(): void {
    this.loadMunicipalities();
  }

  private emptyForm() {
    return {
      code: '',
      nameBn: '',
      nameEn: '',
      addressText: '',
      telephone: '',
      email: '',
      website: '',
      formLanguage: 'BN'
    };
  }

  private unwrap(response: any): any {
    return response?.data ?? response?.payload ?? response?.result ?? response;
  }

  loadMunicipalities(): void {
    this.loading = true;

    this.http.get<any>(this.apiUrl).subscribe({
      next: response => {
        const data = this.unwrap(response);
        this.municipalities = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.showError(error, 'Could not load municipalities.');
      }
    });
  }

  createMunicipality(formDirective: any): void {
    if (this.saving || formDirective.invalid) {
      return;
    }

    this.saving = true;
    this.message = '';
    this.isError = false;

    const payload = {
      ...this.form,
      code: this.form.code.trim().toUpperCase(),
      nameBn: this.form.nameBn.trim(),
      nameEn: this.form.nameEn.trim(),
      addressText: this.form.addressText.trim() || null,
      telephone: this.form.telephone.trim() || null,
      email: this.form.email.trim() || null,
      website: this.form.website.trim() || null
    };

    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: response => {
        this.saving = false;
        this.message = response?.message || 'Municipality created successfully.';
        this.isError = false;
        this.resetForm(formDirective);
        this.loadMunicipalities();
      },
      error: error => {
        this.saving = false;
        this.showError(error, 'Could not create municipality.');
      }
    });
  }

  resetForm(formDirective?: any): void {
    this.form = this.emptyForm();
    formDirective?.resetForm(this.form);
  }

  private showError(error: any, fallback: string): void {
    this.isError = true;

    if (error?.status === 409) {
      this.message = 'This municipality code already exists.';
    } else if (error?.status === 403) {
      this.message = 'Access denied. Only Platform Admin can manage municipalities.';
    } else if (error?.status === 401) {
      this.message = 'Login session is missing or expired. Please log in again.';
    } else {
      this.message = error?.error?.message || fallback;
    }
  }
}
