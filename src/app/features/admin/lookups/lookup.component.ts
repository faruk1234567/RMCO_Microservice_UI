import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API = 'http://localhost:8080/identity-service/api/v1';

interface GeoNode {
  id: number;
  category: string;
  parentId: number | null;
  code: string;
  nameBn: string;
  nameEn: string;
  municipalityId: number | null;
  children?: GeoNode[];
}

interface GeoRow {
  country: string;
  division: string;
  district: string;
  upazila: string;
  local: string;
  ward: string;
  code: string;
  category: string;
}

@Component({
  selector: 'app-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .page { padding: 18px; }
    .card {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(180px, 1fr));
      gap: 12px;
    }
    .field { margin-bottom: 13px; }
    .field label {
      display: block;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .field input, .field select {
      width: 100%;
      padding: 9px;
      border: 1px solid #ccc;
      border-radius: 5px;
      box-sizing: border-box;
    }
    .table-wrap { overflow: auto; max-height: 60vh; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border: 1px solid #ddd;
      padding: 9px;
      text-align: left;
      white-space: nowrap;
    }
    th { background: #f2f4f7; position: sticky; top: 0; }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 15px;
    }
    .btn {
      border: 0;
      padding: 9px 16px;
      border-radius: 5px;
      cursor: pointer;
    }
    .primary { background: #1769aa; color: white; }
    .secondary { background: #777; color: white; }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 12px;
    }
    .modal {
      background: white;
      width: 650px;
      max-width: 96vw;
      max-height: 92vh;
      overflow: auto;
      border-radius: 9px;
      padding: 22px;
    }
    .alert {
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 12px;
    }
    .danger { background: #fce8e8; color: #a40000; }
    .success { background: #e4f5e9; color: #176b32; }
    .muted { color: #777; font-size: 12px; }
    @media(max-width: 800px) {
      .grid { grid-template-columns: 1fr 1fr; }
    }
    @media(max-width: 500px) {
      .grid { grid-template-columns: 1fr; }
    }
  `],
  template: `
    <div class="page">

      <h2>Geography Master Data / ভৌগোলিক মাস্টার ডাটা</h2>

      @if (errorMsg()) {
        <div class="alert danger">{{ errorMsg() }}</div>
      }

      @if (successMsg()) {
        <div class="alert success">{{ successMsg() }}</div>
      }

      <div class="card">
        <h3>Search Geography</h3>

        <div class="grid">
          <div class="field">
            <label>Division</label>
            <input [(ngModel)]="searchDivision"
                   placeholder="Search Division">
          </div>

          <div class="field">
            <label>District</label>
            <input [(ngModel)]="searchDistrict"
                   placeholder="Search District">
          </div>

          <div class="field">
            <label>Upazila</label>
            <input [(ngModel)]="searchUpazila"
                   placeholder="Search Upazila">
          </div>

          <div class="field">
            <label>Union / Paurashava / City Corporation</label>
            <input [(ngModel)]="searchLocal"
                   placeholder="Search local body">
          </div>

          <div class="field">
            <label>Ward</label>
            <input [(ngModel)]="searchWard"
                   placeholder="Search Ward">
          </div>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Division</th>
                <th>District</th>
                <th>Upazila</th>
                <th>Union / Paurashava / City Corporation</th>
                <th>Ward</th>
                <th>Code</th>
                <th>Category</th>
              </tr>
            </thead>

            <tbody>
              @for (r of filteredRows(); track $index) {
                <tr>
                  <td>{{ $index + 1 }}</td>
                  <td>{{ r.division || '—' }}</td>
                  <td>{{ r.district || '—' }}</td>
                  <td>{{ r.upazila || '—' }}</td>
                  <td>{{ r.local || '—' }}</td>
                  <td>{{ r.ward || '—' }}</td>
                  <td>{{ r.code }}</td>
                  <td>{{ r.category }}</td>
                </tr>
              }
            </tbody>
          </table>

          @if (loading()) {
            <p>Loading Geography data...</p>
          }

          @if (!loading() && filteredRows().length === 0) {
            <p>No Geography data found.</p>
          }
        </div>

        <div class="actions">
          <strong>মোট: {{ filteredRows().length }}</strong>
          <button class="btn primary" (click)="openForm()">
            + নতুন Geography Data
          </button>
        </div>
      </div>

      @if (showForm()) {
        <div class="backdrop">
          <div class="modal">

            <h3>নতুন Geography Record তৈরি</h3>

            <div class="field">
              <label>Category নির্বাচন করুন *</label>
              <select [(ngModel)]="category"
                      (ngModelChange)="onCategoryChange()">
                <option value="">-- Category নির্বাচন করুন --</option>
                <option value="DIVISION">Division</option>
                <option value="DISTRICT">District</option>
                <option value="UPAZILA">Upazila</option>
                <option value="UNION">Union</option>
                <option value="PAURASAVA">Paurashava</option>
                <option value="CITY_CORPORATION">City Corporation</option>
                <option value="WARD">Ward</option>
              </select>
            </div>

            <hr>

            <h4>Parent Selection / Cascade</h4>

            <div class="field">
              <label>Country *</label>
              <select [(ngModel)]="countryId"
                      (ngModelChange)="onCountryChange()">
                <option value="">-- Country নির্বাচন করুন --</option>
                @for (c of countries(); track c.id) {
                  <option [value]="c.id">{{ displayName(c) }}</option>
                }
              </select>
            </div>

            @if (needsDivision()) {
              <div class="field">
                <label>Division *</label>
                <select [(ngModel)]="divisionId"
                        (ngModelChange)="onDivisionChange()">
                  <option value="">-- Division নির্বাচন করুন --</option>
                  @for (d of divisions(); track d.id) {
                    <option [value]="d.id">{{ displayName(d) }}</option>
                  }
                </select>
              </div>
            }

            @if (needsDistrict()) {
              <div class="field">
                <label>District *</label>
                <select [(ngModel)]="districtId"
                        (ngModelChange)="onDistrictChange()">
                  <option value="">-- District নির্বাচন করুন --</option>
                  @for (d of districts(); track d.id) {
                    <option [value]="d.id">{{ displayName(d) }}</option>
                  }
                </select>
              </div>
            }

            @if (needsUpazila()) {
              <div class="field">
                <label>Upazila / Thana *</label>
                <select [(ngModel)]="upazilaId"
                        (ngModelChange)="onUpazilaChange()">
                  <option value="">-- Upazila নির্বাচন করুন --</option>
                  @for (u of upazilas(); track u.id) {
                    <option [value]="u.id">{{ displayName(u) }}</option>
                  }
                </select>
              </div>
            }

            @if (needsLocalParent()) {
              <div class="field">
                <label>Union / Paurashava / City Corporation *</label>
                <select [(ngModel)]="localParentId">
                  <option value="">-- Parent নির্বাচন করুন --</option>
                  @for (p of localParents(); track p.id) {
                    <option [value]="p.id">
                      {{ p.category }} - {{ displayName(p) }}
                    </option>
                  }
                </select>
              </div>
            }

            <hr>

            <h4>New Record Information</h4>

            <div class="field">
              <label>Code * (নিজে লিখুন)</label>
              <input [(ngModel)]="code"
                     placeholder="যেমন: 55 / 27 / 10 / 01">
            </div>

            <div class="field">
              <label>বাংলা নাম *</label>
              <input [(ngModel)]="nameBn"
                     placeholder="বাংলা নাম লিখুন">
            </div>

            <div class="field">
              <label>English Name *</label>
              <input [(ngModel)]="nameEn"
                     placeholder="Enter English name">
            </div>

            <div class="field">
              <label>Sort Order</label>
              <input type="number" [(ngModel)]="sortOrder">
            </div>

            <div class="actions">
              <button class="btn secondary"
                      (click)="closeForm()"
                      [disabled]="saving()">
                বাতিল
              </button>

              <button class="btn primary"
                      (click)="save()"
                      [disabled]="saving()">
                {{ saving() ? 'সেভ হচ্ছে...' : 'সেভ করুন' }}
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class LookupComponent implements OnInit {

  countries = signal<GeoNode[]>([]);
  tree = signal<GeoNode[]>([]);

  loading = signal(false);
  saving = signal(false);
  showForm = signal(false);

  errorMsg = signal('');
  successMsg = signal('');

  category = '';
  countryId = '';
  divisionId = '';
  districtId = '';
  upazilaId = '';
  localParentId = '';

  code = '';
  nameBn = '';
  nameEn = '';
  sortOrder = 0;

  searchDivision = '';
  searchDistrict = '';
  searchUpazila = '';
  searchLocal = '';
  searchWard = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadCountries();
    this.loadTree();
  }

  private unwrap(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.content)) return res.content;
    return [];
  }

  displayName(item: GeoNode): string {
    return item.nameBn || item.nameEn || '';
  }

  loadCountries(): void {
    this.http.get<any>(`${API}/lookups/COUNTRY`).subscribe({
      next: res => this.countries.set(this.unwrap(res)),
      error: err => this.showError(err, 'Country load failed')
    });
  }

  loadTree(): void {
    this.loading.set(true);

    this.http.get<any>(`${API}/lookups/geo-tree`).subscribe({
      next: res => {
        this.tree.set(this.unwrap(res));
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.showError(err, 'Geography load failed');
      }
    });
  }

  private showError(err: any, fallback: string): void {
    this.errorMsg.set(
      err?.error?.message || fallback + ' (HTTP ' + err?.status + ')'
    );
  }

  private allNodes(): GeoNode[] {
    const result: GeoNode[] = [];

    const visit = (nodes: GeoNode[]) => {
      for (const node of nodes) {
        result.push(node);
        if (node.children?.length) visit(node.children);
      }
    };

    visit(this.tree());
    return result;
  }

  private findNode(id: string): GeoNode | undefined {
    return this.allNodes().find(n => String(n.id) === String(id));
  }

  divisions(): GeoNode[] {
    return this.tree().filter(d =>
      String(d.parentId) === String(this.countryId)
    );
  }

  districts(): GeoNode[] {
    return this.findNode(this.divisionId)?.children
      ?.filter(n => n.category === 'DISTRICT') || [];
  }

  upazilas(): GeoNode[] {
    return this.findNode(this.districtId)?.children
      ?.filter(n => n.category === 'UPAZILA') || [];
  }

  localParents(): GeoNode[] {
    const allowed = ['UNION', 'PAURASAVA', 'CITY_CORPORATION'];

    return this.findNode(this.upazilaId)?.children
      ?.filter(n => allowed.includes(n.category)) || [];
  }

  needsDivision(): boolean {
    return ['DISTRICT', 'UPAZILA', 'UNION',
      'PAURASAVA', 'CITY_CORPORATION', 'WARD'].includes(this.category);
  }

  needsDistrict(): boolean {
    return ['UPAZILA', 'UNION', 'PAURASAVA',
      'CITY_CORPORATION', 'WARD'].includes(this.category);
  }

  needsUpazila(): boolean {
    return ['UNION', 'PAURASAVA',
      'CITY_CORPORATION', 'WARD'].includes(this.category);
  }

  needsLocalParent(): boolean {
    return this.category === 'WARD';
  }

  onCategoryChange(): void {
    this.resetCascade();
  }

  onCountryChange(): void {
    this.divisionId = '';
    this.districtId = '';
    this.upazilaId = '';
    this.localParentId = '';
  }

  onDivisionChange(): void {
    this.districtId = '';
    this.upazilaId = '';
    this.localParentId = '';
  }

  onDistrictChange(): void {
    this.upazilaId = '';
    this.localParentId = '';
  }

  onUpazilaChange(): void {
    this.localParentId = '';
  }

  private resetCascade(): void {
    this.countryId = '';
    this.divisionId = '';
    this.districtId = '';
    this.upazilaId = '';
    this.localParentId = '';
  }

  openForm(): void {
    this.resetCascade();

    this.category = '';
    this.code = '';
    this.nameBn = '';
    this.nameEn = '';
    this.sortOrder = 0;

    this.errorMsg.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    if (!this.saving()) this.showForm.set(false);
  }

  private getParentId(): number | null {
    switch (this.category) {
      case 'DIVISION':
        return Number(this.countryId);

      case 'DISTRICT':
        return Number(this.divisionId);

      case 'UPAZILA':
        return Number(this.districtId);

      case 'UNION':
      case 'PAURASAVA':
      case 'CITY_CORPORATION':
        return Number(this.upazilaId);

      case 'WARD':
        return Number(this.localParentId);

      default:
        return null;
    }
  }

  async save(): Promise<void> {
    this.errorMsg.set('');

    if (!this.category) {
      this.errorMsg.set('Category নির্বাচন করুন।');
      return;
    }

    if (!this.countryId) {
      this.errorMsg.set('Country নির্বাচন করুন।');
      return;
    }

    if (this.needsDivision() && !this.divisionId) {
      this.errorMsg.set('Division নির্বাচন করুন।');
      return;
    }

    if (this.needsDistrict() && !this.districtId) {
      this.errorMsg.set('District নির্বাচন করুন।');
      return;
    }

    if (this.needsUpazila() && !this.upazilaId) {
      this.errorMsg.set('Upazila নির্বাচন করুন।');
      return;
    }

    if (this.needsLocalParent() && !this.localParentId) {
      this.errorMsg.set('Ward-এর Parent নির্বাচন করুন।');
      return;
    }

    if (!this.code.trim() || !this.nameBn.trim() || !this.nameEn.trim()) {
      this.errorMsg.set('Code, বাংলা নাম এবং English Name দিতে হবে।');
      return;
    }

    const parentId = this.getParentId();

    if (!parentId) {
      this.errorMsg.set('সঠিক Parent নির্বাচন করুন।');
      return;
    }

    const body = {
      category: this.category,
      municipalityId: null,
      parentId,
      code: this.code.trim().toUpperCase(),
      nameBn: this.nameBn.trim(),
      nameEn: this.nameEn.trim(),
      sortOrder: Number(this.sortOrder) || 0
    };

    this.saving.set(true);

    try {
      await firstValueFrom(
        this.http.post(`${API}/lookups`, body)
      );

      this.showForm.set(false);
      this.successMsg.set('Geography record সফলভাবে সংরক্ষিত হয়েছে।');
      this.loadTree();

    } catch (err: any) {
      this.showError(err, 'Geography save failed');
    } finally {
      this.saving.set(false);
    }
  }

  rows = computed<GeoRow[]>(() => {
    const result: GeoRow[] = [];

    const visit = (
      nodes: GeoNode[],
      path: Partial<GeoRow>
    ): void => {
      for (const node of nodes) {
        const next: Partial<GeoRow> = { ...path };

        switch (node.category) {
          case 'COUNTRY':
            next.country = this.displayName(node);
            break;
          case 'DIVISION':
            next.division = this.displayName(node);
            break;
          case 'DISTRICT':
            next.district = this.displayName(node);
            break;
          case 'UPAZILA':
            next.upazila = this.displayName(node);
            break;
          case 'UNION':
          case 'PAURASAVA':
          case 'CITY_CORPORATION':
            next.local = this.displayName(node);
            break;
          case 'WARD':
            next.ward = this.displayName(node);
            break;
        }

        next.code = node.code;
        next.category = node.category;

        result.push({
          country: next.country || '',
          division: next.division || '',
          district: next.district || '',
          upazila: next.upazila || '',
          local: next.local || '',
          ward: next.ward || '',
          code: node.code,
          category: node.category
        });

        if (node.children?.length) {
          visit(node.children, next);
        }
      }
    };

    visit(this.tree(), {});
    return result;
  });

  filteredRows = computed(() => {
    const contains = (value: string, query: string) =>
      !query.trim()
      || value.toLowerCase().includes(query.trim().toLowerCase());

    return this.rows().filter(r =>
      contains(r.division, this.searchDivision) &&
      contains(r.district, this.searchDistrict) &&
      contains(r.upazila, this.searchUpazila) &&
      contains(r.local, this.searchLocal) &&
      contains(r.ward, this.searchWard)
    );
  });
}