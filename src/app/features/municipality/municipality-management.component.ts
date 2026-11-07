
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

type InstitutionType =
  | 'CITY_CORPORATION'
  | 'PAURASHAVA'
  | 'UNION_PARISHAD';

interface GeoNode {
  id: number;
  code: string;
  nameBn: string;
  nameEn: string;
  category: string;
  children: GeoNode[];
}

interface Municipality {
  id: number;
  code: string;
  nameBn: string;
  nameEn: string;
  type?: InstitutionType;
  countryId?: number;
  divisionId?: number;
  districtId?: number;
  upazilaId?: number;
  unionId?: number;
  paurashavaId?: number;
  cityCorporationId?: number;
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
          <h1>Organization Registration</h1>
          <p>Register and manage local government organizations</p>
        </div>

        <button type="button" class="primary"
                (click)="loadMunicipalities()">
          Refresh List
        </button>
      </div>

      <div class="card">

        <h2>Register New Organization</h2>

        <form #organizationForm="ngForm"
              (ngSubmit)="createMunicipality(organizationForm)">

          <h3 class="section-title">Organization Information</h3>

          <div class="form-grid">

            <label>
              Institution Type *
              <select name="type"
                      [(ngModel)]="form.type"
                      (ngModelChange)="onInstitutionTypeChange()"
                      required>
                <option value="">Select Institution Type</option>
                <option value="CITY_CORPORATION">City Corporation</option>
                <option value="PAURASHAVA">Paurashava</option>
                <option value="UNION_PARISHAD">Union Parishad</option>
              </select>
            </label>

          </div>

          <h3 class="section-title">Geographical Location</h3>

          <div class="form-grid">

            <label>
              Division *
              <select name="divisionId"
                      [(ngModel)]="form.divisionId"
                      (ngModelChange)="onDivisionChange()"
                      required>
                <option [ngValue]="null">Select Division</option>
                <option *ngFor="let item of divisions"
                        [ngValue]="item.id">
                  {{ item.nameBn }} ({{ item.nameEn }})
                </option>
              </select>
            </label>

            <label>
              District *
              <select name="districtId"
                      [(ngModel)]="form.districtId"
                      (ngModelChange)="onDistrictChange()"
                      [disabled]="!form.divisionId"
                      required>
                <option [ngValue]="null">Select District</option>
                <option *ngFor="let item of districts"
                        [ngValue]="item.id">
                  {{ item.nameBn }} ({{ item.nameEn }})
                </option>
              </select>
            </label>

            <label>
              Upazila *
              <select name="upazilaId"
                      [(ngModel)]="form.upazilaId"
                      (ngModelChange)="onUpazilaChange()"
                      [disabled]="!form.districtId"
                      required>
                <option [ngValue]="null">Select Upazila</option>
                <option *ngFor="let item of upazilas"
                        [ngValue]="item.id">
                  {{ item.nameBn }} ({{ item.nameEn }})
                </option>
              </select>
            </label>

            <label>
              Select Existing Organization Geography *
              <select name="organizationGeoId"
                      [(ngModel)]="form.organizationGeoId"
                      [disabled]="!form.upazilaId || !form.type"
                      required>
                <option [ngValue]="null">Select Organization</option>
                <option *ngFor="let item of organizationGeographies"
                        [ngValue]="item.id">
                  {{ item.nameBn }} ({{ item.nameEn }})
                </option>
              </select>

              <small *ngIf="form.upazilaId && form.type &&
                           organizationGeographies.length === 0">
                No matching Geography records found.
                Please check Geography Master.
              </small>
            </label>

          </div>

          <div class="selected-info"
               *ngIf="selectedOrganization">

            <h3>Selected Organization</h3>

            <p>
              <strong>Code:</strong>
              {{ selectedOrganization.code }}
            </p>

            <p>
              <strong>Bangla Name:</strong>
              {{ selectedOrganization.nameBn }}
            </p>

            <p>
              <strong>English Name:</strong>
              {{ selectedOrganization.nameEn }}
            </p>

          </div>

          <h3 class="section-title">Contact Information</h3>

          <div class="form-grid">

            <label>
              Telephone
              <input name="telephone"
                     [(ngModel)]="form.telephone"
                     maxlength="30"
                     placeholder="Telephone number">
            </label>

            <label>
              Email
              <input type="email"
                     name="email"
                     [(ngModel)]="form.email"
                     maxlength="150"
                     placeholder="official@example.com">
            </label>

            <label>
              Website
              <input type="url"
                     name="website"
                     [(ngModel)]="form.website"
                     maxlength="255"
                     placeholder="https://example.com">
            </label>

            <label>
              Form Language *
              <select name="formLanguage"
                      [(ngModel)]="form.formLanguage"
                      required>
                <option value="BN">Bangla (BN)</option>
                <option value="EN">English (EN)</option>
              </select>
            </label>

            <label class="full">
              Address
              <textarea name="addressText"
                        [(ngModel)]="form.addressText"
                        rows="3"
                        placeholder="Full address"></textarea>
            </label>

          </div>

          <div class="actions">

            <button type="submit"
                    class="primary"
                    [disabled]="organizationForm.invalid || saving">
              {{ saving ? 'Saving...' : 'Register Organization' }}
            </button>

            <button type="button"
                    class="secondary"
                    (click)="resetForm(organizationForm)">
              Clear
            </button>

          </div>

        </form>

        <p *ngIf="message"
           class="message"
           [class.error]="isError">
          {{ message }}
        </p>

      </div>

      <div class="card">

        <div class="list-header">
          <h2>Registered Organizations</h2>
          <span>Total: {{ municipalities.length }}</span>
        </div>

        <p *ngIf="loading">Loading organizations...</p>

        <div class="table-wrap" *ngIf="!loading">

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Code</th>
                <th>Organization</th>
                <th>Institution Type</th>
                <th>Geographical Location</th>
                <th>Telephone</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              <tr *ngFor="let m of municipalities">
                <td>{{ m.id }}</td>

                <td>{{ m.code }}</td>

                <td>
                  <strong>{{ m.nameBn }}</strong>
                  <small>{{ m.nameEn }}</small>
                </td>

                <td>{{ getTypeLabel(m.type) }}</td>

                <td class="geo-cell">
                  <strong>{{ getGeoName(m.divisionId) }}</strong>
                  <small>{{ getGeoName(m.districtId) }}</small>

                  <small *ngIf="m.upazilaId">
                    {{ getGeoName(m.upazilaId) }}
                  </small>

                  <small *ngIf="m.unionId">
                    {{ getGeoName(m.unionId) }}
                  </small>

                  <small *ngIf="m.paurashavaId">
                    {{ getGeoName(m.paurashavaId) }}
                  </small>

                  <small *ngIf="m.cityCorporationId">
                    {{ getGeoName(m.cityCorporationId) }}
                  </small>
                </td>

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
                <td colspan="8" class="empty">
                  No organizations found.
                </td>
              </tr>

            </tbody>
          </table>

        </div>
      </div>

    </section>
  `,
  styles: [`
    :host {
      display: block;
      color: var(--text-color, #243047);
    }

    .page {
      max-width: 1400px;
      margin: auto;
      padding: 24px;
    }

    .page-header,
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 26px;
    }

    h2 {
      margin: 0 0 20px;
      font-size: 19px;
    }

    h3.section-title {
      font-size: 15px;
      margin: 26px 0 16px;
      padding-bottom: 9px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }

    p {
      color: #64748b;
    }

    .card {
      background: var(--card-background, #fff);
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin-top: 24px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: 14px;
    }

    input,
    select,
    textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 11px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      font: inherit;
      background: white;
      color: #243047;
    }

    input:focus,
    select:focus,
    textarea:focus {
      outline: 2px solid #93c5fd;
      border-color: #2563eb;
    }

    select:disabled {
      background: #f1f5f9;
      cursor: not-allowed;
    }

    .full {
      grid-column: 1 / -1;
    }

    .selected-info {
      margin-top: 18px;
      padding: 16px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
    }

    .selected-info h3 {
      margin-top: 0;
    }

    .selected-info p {
      margin: 7px 0;
      color: #1e3a8a;
    }

    .actions {
      display: flex;
      gap: 10px;
      margin-top: 22px;
    }

    button {
      padding: 11px 16px;
      border: 0;
      border-radius: 7px;
      cursor: pointer;
      font-weight: 600;
    }

    button:disabled {
      opacity: .55;
      cursor: not-allowed;
    }

    .primary {
      background: #1d4ed8;
      color: white;
    }

    .secondary {
      background: #e2e8f0;
      color: #243047;
    }

    .table-wrap {
      overflow-x: auto;
      margin-top: 18px;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      min-width: 1100px;
    }

    th,
    td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }

    th {
      background: #f8fafc;
      font-size: 13px;
      white-space: nowrap;
    }

    td small {
      display: block;
      margin-top: 4px;
      color: #64748b;
    }

    .geo-cell {
      min-width: 180px;
    }

    .active,
    .inactive {
      font-weight: 600;
    }

    .active {
      color: #15803d;
    }

    .inactive {
      color: #b91c1c;
    }

    .message {
      margin-top: 18px;
      color: #15803d;
    }

    .message.error {
      color: #b91c1c;
    }

    .empty {
      text-align: center;
      color: #64748b;
    }

    @media (max-width: 700px) {
      .page {
        padding: 12px;
      }

      .card {
        padding: 16px;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .full {
        grid-column: auto;
      }
    }
  `]
})
export class MunicipalityManagementComponent implements OnInit {

  private http = inject(HttpClient);

  private readonly apiUrl = '/api/v1/platform/municipalities';

  private readonly lookupApi =
    'http://localhost:8080/identity-service/api/v1/lookups';

  municipalities: Municipality[] = [];

  countries: GeoNode[] = [];
  geoTree: GeoNode[] = [];

  saving = false;
  loading = false;
  message = '';
  isError = false;

  form = this.emptyForm();

  get divisions(): GeoNode[] {
    return this.geoTree;
  }

  get districts(): GeoNode[] {
    return this.findNode(this.form.divisionId)?.children ?? [];
  }

  get upazilas(): GeoNode[] {
    return this.findNode(this.form.districtId)?.children ?? [];
  }

  get organizationGeographies(): GeoNode[] {
    if (!this.form.upazilaId || !this.form.type) {
      return [];
    }

    const expectedCategory = this.getExpectedCategory();

    return this.findNode(this.form.upazilaId)?.children
      .filter(item => item.category === expectedCategory) ?? [];
  }

  get selectedOrganization(): GeoNode | undefined {
    if (!this.form.organizationGeoId) {
      return undefined;
    }

    return this.organizationGeographies.find(
      item => item.id === this.form.organizationGeoId
    );
  }

  ngOnInit(): void {
    this.loadMunicipalities();
    this.loadGeoTree();
  }

  private emptyForm() {
    return {
      type: '' as InstitutionType | '',
      divisionId: null as number | null,
      districtId: null as number | null,
      upazilaId: null as number | null,
      organizationGeoId: null as number | null,
      addressText: '',
      telephone: '',
      email: '',
      website: '',
      formLanguage: 'BN'
    };
  }

  private unwrap(response: any): any {
    return response?.data ??
           response?.payload ??
           response?.result ??
           response;
  }

  private toNodes(value: any): GeoNode[] {
    let items = value;

    if (!Array.isArray(items)) {
      items = items?.items ??
              items?.content ??
              items?.data ??
              [];
    }

    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item: any) => ({
      id: Number(item.id),
      code: item.code ?? '',
      nameBn: item.nameBn ?? item.name_bn ?? item.name ?? '',
      nameEn: item.nameEn ?? item.name_en ?? item.name ?? '',
      category: String(
        item.category ?? item.categoryCode ?? ''
      ).toUpperCase(),
      children: this.toNodes(
        item.children ?? item.child ?? item.items ?? []
      )
    }));
  }

  loadGeoTree(): void {
    this.http.get<any>(`${this.lookupApi}/geo-tree`).subscribe({
      next: response => {
        this.geoTree = this.toNodes(this.unwrap(response));
      },
      error: error => {
        this.geoTree = [];
        this.showError(error, 'Could not load geographical information.');
      }
    });
  }

  private findNode(id: number | null | undefined): GeoNode | undefined {
    if (id == null) {
      return undefined;
    }

    const search = (nodes: GeoNode[]): GeoNode | undefined => {
      for (const node of nodes) {
        if (node.id === Number(id)) {
          return node;
        }

        const found = search(node.children);

        if (found) {
          return found;
        }
      }

      return undefined;
    };

    return search(this.geoTree);
  }

  private getExpectedCategory(): string {
    switch (this.form.type) {
      case 'CITY_CORPORATION':
        return 'CITY_CORPORATION';

      case 'PAURASHAVA':
        return 'PAURASAVA';

      case 'UNION_PARISHAD':
        return 'UNION';

      default:
        return '';
    }
  }

  onInstitutionTypeChange(): void {
    this.form.divisionId = null;
    this.form.districtId = null;
    this.form.upazilaId = null;
    this.form.organizationGeoId = null;
  }

  onDivisionChange(): void {
    this.form.districtId = null;
    this.form.upazilaId = null;
    this.form.organizationGeoId = null;
  }

  onDistrictChange(): void {
    this.form.upazilaId = null;
    this.form.organizationGeoId = null;
  }

  onUpazilaChange(): void {
    this.form.organizationGeoId = null;
  }

  getTypeLabel(type?: InstitutionType): string {
    switch (type) {
      case 'CITY_CORPORATION':
        return 'City Corporation';

      case 'PAURASHAVA':
        return 'Paurashava';

      case 'UNION_PARISHAD':
        return 'Union Parishad';

      default:
        return '-';
    }
  }

  getGeoName(id?: number): string {
    if (id == null) {
      return '-';
    }

    const node = this.findNode(id);

    return node
      ? `${node.nameBn} (${node.nameEn})`
      : '-';
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
        this.showError(error, 'Could not load organizations.');
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
      type: this.form.type,
      organizationGeoId: this.form.organizationGeoId,
      addressText: this.form.addressText.trim() || null,
      telephone: this.form.telephone.trim() || null,
      email: this.form.email.trim() || null,
      website: this.form.website.trim() || null,
      formLanguage: this.form.formLanguage
    };

    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: response => {
        this.saving = false;
        this.message =
          response?.message || 'Organization created successfully.';

        this.isError = false;
        this.resetForm(formDirective);
        this.loadMunicipalities();
      },
      error: error => {
        this.saving = false;
        this.showError(error, 'Could not create organization.');
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
      this.message = 'This organization is already registered.';
    } else if (error?.status === 403) {
      this.message =
        'Access denied. Only Platform Admin can manage organizations.';
    } else if (error?.status === 401) {
      this.message =
        'Login session is missing or expired. Please log in again.';
    } else {
      this.message =
        error?.error?.message || fallback;
    }
  }
}
