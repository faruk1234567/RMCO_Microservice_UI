import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>ব্যবহারকারী ব্যবস্থাপনা</h1>

        @if (!isPlatformAdmin()) {
          <button
            type="button"
            class="btn btn-primary"
            (click)="toggleCitizenForm()"
          >
            {{ showCitizenForm() ? 'ফর্ম বন্ধ করুন' : '+ নতুন নাগরিক যোগ করুন' }}
          </button>
        }
      </div>

      <div class="page-body">
      @if (errorMsg()) {
        <div class="alert alert-danger">{{ errorMsg() }}</div>
      }

      @if (successMsg()) {
        <div class="alert alert-success">{{ successMsg() }}</div>
      }

      <!-- Municipality User only: Add Citizen -->
      @if (!isPlatformAdmin() && showCitizenForm()) {
        <div class="card citizen-create-card">
          <div class="card-body">
            <h2>নতুন নাগরিক নিবন্ধন</h2>

            <p class="form-note">
              * চিহ্নিত ফিল্ডগুলো আবশ্যক।
            </p>

            <form (ngSubmit)="createCitizen()" #citizenNgForm="ngForm">
              <h3>ব্যক্তিগত তথ্য</h3>

              <div class="citizen-form-grid">
                <div class="form-group">
                  <label>নাগরিকের বাংলা নাম *</label>
                  <input
                    class="form-control"
                    name="nameBn"
                    [(ngModel)]="citizenForm.nameBn"
                    required
                    maxlength="200"
                    placeholder="বাংলা নাম লিখুন"
                  />
                </div>

                <div class="form-group">
                  <label>নাগরিকের ইংরেজি নাম</label>
                  <input
                    class="form-control"
                    name="nameEn"
                    [(ngModel)]="citizenForm.nameEn"
                    maxlength="200"
                    placeholder="Name in English"
                  />
                </div>

                <div class="form-group">
                  <label>মোবাইল নম্বর *</label>
                  <input
                    class="form-control"
                    name="mobile"
                    [(ngModel)]="citizenForm.mobile"
                    required
                    maxlength="20"
                    type="tel"
                    placeholder="মোবাইল নম্বর লিখুন"
                  />
                </div>

                <div class="form-group">
                  <label>ইমেইল</label>
                  <input
                    class="form-control"
                    name="email"
                    [(ngModel)]="citizenForm.email"
                    type="email"
                    maxlength="254"
                    placeholder="example@email.com"
                  />
                </div>

                <div class="form-group">
                  <label>জন্মতারিখ</label>
                  <input
                    class="form-control"
                    name="dateOfBirth"
                    [(ngModel)]="citizenForm.dateOfBirth"
                    type="date"
                  />
                </div>

                <div class="form-group">
                  <label>Gender ID</label>
                  <input
                    class="form-control"
                    name="genderId"
                    [(ngModel)]="citizenForm.genderId"
                    type="number"
                    min="1"
                    placeholder="Gender ID (যদি প্রযোজ্য হয়)"
                  />
                </div>

                <div class="form-group">
                  <label>তথ্য প্রদানের ভাষা</label>
                  <select
                    class="form-control"
                    name="entryLanguage"
                    [(ngModel)]="citizenForm.entryLanguage"
                  >
                    <option value="BN">বাংলা</option>
                    <option value="EN">English</option>
                  </select>
                </div>
              </div>

              <h3>পারিবারিক তথ্য</h3>

              <div class="citizen-form-grid">
                <div class="form-group">
                  <label>পিতার বাংলা নাম</label>
                  <input
                    class="form-control"
                    name="fatherNameBn"
                    [(ngModel)]="citizenForm.fatherNameBn"
                    maxlength="200"
                  />
                </div>

                <div class="form-group">
                  <label>পিতার ইংরেজি নাম</label>
                  <input
                    class="form-control"
                    name="fatherNameEn"
                    [(ngModel)]="citizenForm.fatherNameEn"
                    maxlength="200"
                  />
                </div>

                <div class="form-group">
                  <label>মাতার বাংলা নাম</label>
                  <input
                    class="form-control"
                    name="motherNameBn"
                    [(ngModel)]="citizenForm.motherNameBn"
                    maxlength="200"
                  />
                </div>

                <div class="form-group">
                  <label>মাতার ইংরেজি নাম</label>
                  <input
                    class="form-control"
                    name="motherNameEn"
                    [(ngModel)]="citizenForm.motherNameEn"
                    maxlength="200"
                  />
                </div>

                <div class="form-group spouse-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      name="hasSpouse"
                      [(ngModel)]="citizenForm.hasSpouse"
                    />
                    স্বামী/স্ত্রী আছেন
                  </label>
                </div>

                @if (citizenForm.hasSpouse) {
                  <div class="form-group">
                    <label>স্বামী/স্ত্রীর বাংলা নাম</label>
                    <input
                      class="form-control"
                      name="spouseNameBn"
                      [(ngModel)]="citizenForm.spouseNameBn"
                      maxlength="200"
                    />
                  </div>

                  <div class="form-group">
                    <label>স্বামী/স্ত্রীর ইংরেজি নাম</label>
                    <input
                      class="form-control"
                      name="spouseNameEn"
                      [(ngModel)]="citizenForm.spouseNameEn"
                      maxlength="200"
                    />
                  </div>
                }
              </div>

              <h3>পরিচয়পত্রের তথ্য</h3>

              <p class="form-note">
                নিরাপত্তার জন্য শুধু পরিচয়পত্রের শেষ ৪টি সংখ্যা দিন।
              </p>

              <div class="citizen-form-grid">
                <div class="form-group">
                  <label>NID-এর শেষ ৪ সংখ্যা</label>
                  <input
                    class="form-control"
                    name="nidLast4"
                    [(ngModel)]="citizenForm.nidLast4"
                    inputmode="numeric"
                    maxlength="4"
                    placeholder="যেমন: 1234"
                  />
                </div>

                <div class="form-group">
                  <label>জন্মনিবন্ধনের শেষ ৪ সংখ্যা</label>
                  <input
                    class="form-control"
                    name="birthRegLast4"
                    [(ngModel)]="citizenForm.birthRegLast4"
                    inputmode="numeric"
                    maxlength="4"
                  />
                </div>

                <div class="form-group">
                  <label>পাসপোর্টের শেষ ৪ সংখ্যা</label>
                  <input
                    class="form-control"
                    name="passportLast4"
                    [(ngModel)]="citizenForm.passportLast4"
                    inputmode="numeric"
                    maxlength="4"
                  />
                </div>

                <div class="form-group">
                  <label>ড্রাইভিং লাইসেন্সের শেষ ৪ সংখ্যা</label>
                  <input
                    class="form-control"
                    name="drivingLicenseLast4"
                    [(ngModel)]="citizenForm.drivingLicenseLast4"
                    inputmode="numeric"
                    maxlength="4"
                  />
                </div>
              </div>

              <h3>পেশাগত তথ্য (ঐচ্ছিক)</h3>

              <div class="citizen-form-grid">
                <div class="form-group">
                  <label>পদবি (বাংলা)</label>
                  <input
                    class="form-control"
                    name="designationBn"
                    [(ngModel)]="citizenForm.designationBn"
                    maxlength="200"
                  />
                </div>

                <div class="form-group">
                  <label>পদবি (English)</label>
                  <input
                    class="form-control"
                    name="designationEn"
                    [(ngModel)]="citizenForm.designationEn"
                    maxlength="200"
                  />
                </div>

                <div class="form-group">
                  <label>প্রতিষ্ঠান/অফিস (বাংলা)</label>
                  <input
                    class="form-control"
                    name="officeBn"
                    [(ngModel)]="citizenForm.officeBn"
                    maxlength="200"
                  />
                </div>

                <div class="form-group">
                  <label>প্রতিষ্ঠান/অফিস (English)</label>
                  <input
                    class="form-control"
                    name="officeEn"
                    [(ngModel)]="citizenForm.officeEn"
                    maxlength="200"
                  />
                </div>
              </div>

              <div class="citizen-form-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  [disabled]="creatingCitizen()"
                  (click)="resetCitizenForm(citizenNgForm)"
                >
                  ফর্ম পরিষ্কার
                </button>

                <button
                  type="button"
                  class="btn btn-secondary"
                  [disabled]="creatingCitizen()"
                  (click)="toggleCitizenForm()"
                >
                  বাতিল
                </button>

                <button
                  type="submit"
                  class="btn btn-primary"
                  [disabled]="creatingCitizen() || citizenNgForm.invalid"
                >
                  {{ creatingCitizen() ? 'সংরক্ষণ হচ্ছে...' : 'নাগরিক সংরক্ষণ করুন' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (isPlatformAdmin() || !showCitizenForm()) {
        <!-- Existing Search UI -->
        <div class="card search-card">
          <div class="card-body">
            @if (isPlatformAdmin()) {
              <div class="form-group municipality-field">
                <label>Municipality নির্বাচন করুন</label>

                <select
                  class="form-control"
                  [(ngModel)]="selectedMunicipalityId"
                  name="municipalityId"
                >
                  <option [ngValue]="null">
                    -- সব Municipality / নির্বাচন করুন --
                  </option>

                  @for (m of municipalities(); track m.id) {
                    <option [ngValue]="m.id">
                      {{ m.nameBn || m.nameEn || m.name || m.code }}
                    </option>
                  }
                </select>
              </div>
            }

            <div class="form-row search-row">
              <div class="form-group grow">
                <label>মোবাইল নম্বর</label>
                <input
                  class="form-control"
                  [(ngModel)]="mobile"
                  name="mobile"
                  placeholder="মোবাইল নম্বর লিখুন"
                  (keyup.enter)="search()"
                />
              </div>

              <div class="form-group grow">
                <label>গ্রাহকের নাম</label>
                <input
                  class="form-control"
                  [(ngModel)]="name"
                  name="customerName"
                  placeholder="নাম লিখুন"
                  (keyup.enter)="search()"
                />
              </div>

              <div class="form-group grow">
                <label>Verification Status</label>
                <select
                  class="form-control"
                  [(ngModel)]="verificationStatus"
                  name="verificationStatus"
                >
                  <option value="">সব Status</option>
                  <option value="VERIFIED">যাচাইকৃত</option>
                  <option value="UNVERIFIED">যাচাই হয়নি</option>
                  <option value="PENDING">অপেক্ষমাণ</option>
                </select>
              </div>

              <button
                type="button"
                class="btn btn-primary search-button"
                [disabled]="searching()"
                (click)="search()"
              >
                {{ searching() ? 'খুঁজছে...' : 'সার্চ' }}
              </button>

              <button
                type="button"
                class="btn btn-secondary search-button"
                [disabled]="searching()"
                (click)="clearSearch()"
              >
                পরিষ্কার
              </button>
            </div>
          </div>
        </div>

        @if (hasSearched()) {
          <div class="card results-card">
            <div class="card-body results-body">
              <div class="table-area">
                <table class="data-table">
                  <thead>
                    <tr>
                      @if (isPlatformAdmin()) {
                        <th>Organization Name</th>
                      }
                      <th>ID (মোবাইল)</th>
                      <th>গ্রাহকের নাম</th>
                      <th>জন্মতারিখ</th>
                      <th>NID</th>
                      <th>জন্মনিবন্ধন নম্বর</th>
                      <th>Verification Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    @for (u of paginatedUsers(); track u.id || u.userId) {
                      <tr>
                        @if (isPlatformAdmin()) {
                          <td>{{ organizationName(u) }}</td>
                        }
                        <td>{{ u.mobile || u.mobileMasked || '—' }}</td>
                        <td>{{ u.nameBn || u.nameEn || '—' }}</td>
                        <td>{{ u.dateOfBirth || '—' }}</td>
                        <td>{{ u.nid || u.nidLast4 || '—' }}</td>
                        <td>{{ u.birthRegistrationNumber || u.birthRegLast4 || '—' }}</td>
                        <td>
                          <span
                            class="badge"
                            [ngClass]="statusClass(u.verificationStatus)"
                          >
                            {{ statusLabel(u.verificationStatus) }}
                          </span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td
                          [attr.colspan]="isPlatformAdmin() ? 7 : 6"
                          class="empty-row"
                        >
                          কোনো ব্যবহারকারী পাওয়া যায়নি।
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="table-footer">
                <div class="citizen-count">
                  <strong>Number of Citizens:</strong>
                  <span>{{ users().length }}</span>
                </div>

                @if (users().length > pageSize) {
                  <div class="pagination">
                    <button
                      type="button"
                      class="page-button"
                      [disabled]="currentPage() === 1"
                      (click)="goToPage(currentPage() - 1)"
                    >
                      Previous
                    </button>

                    @for (page of pageNumbers(); track page) {
                      <button
                        type="button"
                        class="page-button"
                        [class.active-page]="currentPage() === page"
                        (click)="goToPage(page)"
                      >
                        {{ page }}
                      </button>
                    }

                    <button
                      type="button"
                      class="page-button"
                      [disabled]="currentPage() === totalPages()"
                      (click)="goToPage(currentPage() + 1)"
                    >
                      Next
                    </button>
                  </div>
                }

                <div class="page-info">
                  @if (users().length > 0) {
                    {{ (currentPage() - 1) * pageSize + 1 }} -
                    {{ min(currentPage() * pageSize, users().length) }}
                    / {{ users().length }} জন
                  } @else {
                    ০ জন
                  }
                </div>
              </div>
            </div>
          </div>
        }
      }

      @if (profile()) {
        <div class="modal-overlay" (click)="profile.set(null)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>প্রোফাইল</h3>
              <button
                class="btn btn-sm btn-secondary"
                (click)="profile.set(null)"
              >×</button>
            </div>
            <div class="modal-body">
              <pre class="profile-json">{{ profile() | json }}</pre>
            </div>
          </div>
        </div>
      }

      @if (userRoles()) {
        <div class="modal-overlay" (click)="userRoles.set(null)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>ইউজারের রোল</h3>
              <button
                class="btn btn-sm btn-secondary"
                (click)="userRoles.set(null)"
              >×</button>
            </div>
            <div class="modal-body">
              @if (rolesLoading()) {
                <div class="spinner"></div>
              }
              @if (!rolesLoading()) {
                <ul class="role-list">
                  @for (
                    r of userRoles()!;
                    track r.id || r.roleId || r.code || $index
                  ) {
                    <li>
                      <strong>{{ r.nameBn || r.name || r.code }}</strong>
                      @if (r.code) {
                        <code>{{ r.code }}</code>
                      }
                    </li>
                  } @empty {
                    <li class="text-muted">কোনো রোল নেই</li>
                  }
                </ul>
              }
            </div>
          </div>
        </div>
      }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      overflow: hidden;
      min-height: 0;
    }

    .page-container {
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    /* Component-er header: kokhono scroll hobe na */
    .page-header {
      flex: 0 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding: 8px 0 10px;
      border-bottom: 1px solid #e5e7eb;
    }

    /* Shudhu ei ongsho scroll hobe */
    .page-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px 4px 24px 0;
    }

    /* card gulo jeno chepe chhoto na hoy */
    .page-body > * {
      flex-shrink: 0;
    }

    .page-header h1 { margin: 0; font-size: 1.4rem; }

    .alert { margin: 0; padding: 8px 12px; }

    /* ---------- Citizen form (BizRunner-style) ---------- */
    .citizen-create-card { margin: 0; }
    .citizen-create-card .card-body { padding: 16px; }

    .citizen-create-card h2 {
      margin: 0 0 6px;
      color: #0a5c36;
      font-size: 1.25rem;
    }

    .citizen-create-card h3 {
      margin: 18px 0 8px;
      padding: 8px 12px;
      background: #e8f1ec;
      border: 1px solid #d3e0d8;
      font-size: 0.95rem;
      color: #0a5c36;
    }

    .form-note {
      margin: 4px 0 10px;
      color: #6b7280;
      font-size: 0.82rem;
    }

    .citizen-form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      border-top: 1px solid #d9e2dd;
      border-left: 1px solid #d9e2dd;
    }

    .citizen-form-grid .form-group {
      display: grid;
      grid-template-columns: 42% 58%;
      align-items: stretch;
      margin: 0;
      min-width: 0;
      border-right: 1px solid #d9e2dd;
      border-bottom: 1px solid #d9e2dd;
    }

    .citizen-form-grid .form-group > label {
      display: flex;
      align-items: center;
      margin: 0;
      padding: 8px 12px;
      background: #f1f5f4;
      font-size: 0.85rem;
    }

    .citizen-form-grid .form-control {
      align-self: center;
      width: calc(100% - 16px);
      margin: 6px 8px;
      box-sizing: border-box;
    }

    .spouse-checkbox {
      grid-column: 1 / -1;
      grid-template-columns: 1fr !important;
    }

    .spouse-checkbox label {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f1f5f4;
      padding: 8px 12px;
    }

    .citizen-form-actions {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid #e5e7eb;
    }

    /* ---------- Search ---------- */
    .search-card { margin: 0; }
    .search-card .card-body { padding: 12px; }

    .municipality-field {
      max-width: 480px;
      margin-bottom: 12px;
    }

    .grow { flex: 1 1 180px; min-width: 0; }

    .search-row {
      display: flex;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 10px;
    }

    .search-row .form-group { margin-bottom: 0; }

    .search-row label,
    .municipality-field label {
      display: block;
      margin-bottom: 4px;
      font-size: 0.85rem;
    }

    .search-row .form-control,
    .municipality-field .form-control {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .search-button {
      flex: 0 0 auto;
      white-space: nowrap;
    }

    /* ---------- Results ---------- */
    .results-card { margin: 0; }
    .results-body { padding: 0 12px 10px; }

    .table-area {
      max-height: 55vh;
      overflow: auto;
    }

    .data-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }

    .data-table th,
    .data-table td {
      padding: 7px 6px;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
      white-space: normal;
      overflow-wrap: anywhere;
      font-size: 0.78rem;
      line-height: 1.25;
    }

    .data-table th {
      position: sticky;
      top: 0;
      background: #f5f7f6;
      font-weight: 600;
    }

    .empty-row {
      text-align: center !important;
      padding: 20px 8px !important;
    }

    .table-footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding-top: 8px;
      border-top: 2px solid #e5e7eb;
    }

    .citizen-count {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
    }

    .citizen-count span { font-weight: 700; font-size: 1rem; }

    .pagination {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 4px;
    }

    .page-button {
      min-width: 32px;
      height: 32px;
      padding: 4px 8px;
      border: 1px solid #d1d5db;
      border-radius: 5px;
      background: #fff;
      color: #374151;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .page-button:disabled { opacity: 0.4; cursor: not-allowed; }

    .page-button.active-page {
      color: #fff;
      background: #0a5c36;
      border-color: #0a5c36;
    }

    .page-info {
      font-size: 0.8rem;
      color: #6b7280;
      white-space: nowrap;
    }

    /* ---------- Modals ---------- */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-card {
      background: #fff;
      border-radius: 12px;
      width: 100%;
      max-width: 560px;
      max-height: 80vh;
      overflow: auto;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e8eee9;
    }

    .modal-header h3 { margin: 0; color: #0a5c36; }
    .modal-body { padding: 20px; }

    .profile-json {
      background: #f5f9f6;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.82rem;
      overflow-wrap: anywhere;
      max-height: 400px;
      overflow: auto;
    }

    .role-list { list-style: none; padding: 0; margin: 0; }

    .role-list li {
      padding: 10px 12px;
      border-bottom: 1px solid #e8eee9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .role-list code {
      font-size: 0.8rem;
      background: #f0f4f1;
      padding: 2px 6px;
      border-radius: 4px;
      overflow-wrap: anywhere;
    }

    /* ---------- Responsive ---------- */
    @media (max-width: 900px) {
      .data-table th,
      .data-table td {
        padding: 5px 3px;
        font-size: 0.7rem;
      }

      .table-footer { justify-content: center; }
    }

    @media (max-width: 650px) {
      .citizen-form-grid { grid-template-columns: minmax(0, 1fr); }
      .citizen-form-actions button { flex: 1 1 auto; }
    }
  `],
})
export class UserAdminComponent implements OnInit, AfterViewInit, OnDestroy {
  // Component-er height = screen-er baki jaiga (nav/tab bar-er niche theke)
  @HostBinding('style.height.px') hostHeight: number | null = null;

  private prevHtmlOverflow = '';
  private prevBodyOverflow = '';

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateHostHeight();
  }

  mobile = '';
  name = '';
  verificationStatus = '';

  readonly pageSize = 10;
  currentPage = signal(1);

  users = signal<any[]>([]);
  searching = signal(false);
  errorMsg = signal('');
  successMsg = signal('');
  hasSearched = signal(false);

  profile = signal<any>(null);
  userRoles = signal<any[] | null>(null);
  rolesLoading = signal(false);

  municipalities = signal<any[]>([]);
  selectedMunicipalityId: number | null = null;
  isPlatformAdmin = signal(false);

  // Citizen form state
  showCitizenForm = signal(false);
  creatingCitizen = signal(false);

  citizenForm: any = this.emptyCitizenForm();

  constructor(
    private admin: AdminService,
    private auth: AuthService,
    private host: ElementRef<HTMLElement>
  ) {}

  ngAfterViewInit(): void {
    // Browser-er main scrollbar bondho: nav/tab bar sobshomoy dekha jabe,
    // shudhu component-er vetorer ongsho scroll hobe.
    window.scrollTo(0, 0);

    this.prevHtmlOverflow = document.documentElement.style.overflow;
    this.prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    setTimeout(() => this.updateHostHeight());
  }

  ngOnDestroy(): void {
    document.documentElement.style.overflow = this.prevHtmlOverflow;
    document.body.style.overflow = this.prevBodyOverflow;
  }

  private updateHostHeight(): void {
    const top = this.host.nativeElement.getBoundingClientRect().top;
    this.hostHeight = Math.max(320, window.innerHeight - top - 8);
  }

  ngOnInit(): void {
    const isPlatform =
      this.auth.hasRole('PLATFORM_ADMIN') ||
      this.auth.hasRole('ROLE_PLATFORM_ADMIN');

    this.isPlatformAdmin.set(isPlatform);

    if (isPlatform) {
      this.loadMunicipalities();
    } else {
      this.search();
    }
  }

  private emptyCitizenForm(): any {
    return {
      nameBn: '',
      nameEn: '',
      mobile: '',
      email: '',
      dateOfBirth: '',
      genderId: null,
      fatherNameBn: '',
      fatherNameEn: '',
      motherNameBn: '',
      motherNameEn: '',
      hasSpouse: false,
      spouseNameBn: '',
      spouseNameEn: '',
      designationBn: '',
      designationEn: '',
      officeBn: '',
      officeEn: '',
      nidLast4: '',
      birthRegLast4: '',
      passportLast4: '',
      drivingLicenseLast4: '',
      entryLanguage: 'BN',
    };
  }

  toggleCitizenForm(): void {
    // Platform Admin must never use this feature.
    if (this.isPlatformAdmin() || this.creatingCitizen()) {
      return;
    }

    const opening = !this.showCitizenForm();

    this.errorMsg.set('');
    this.successMsg.set('');
    this.showCitizenForm.set(opening);

    if (opening) {
      this.citizenForm = this.emptyCitizenForm();
    }
  }

  resetCitizenForm(form?: { resetForm: () => void }): void {
    this.citizenForm = this.emptyCitizenForm();

    form?.resetForm();

    this.errorMsg.set('');
  }

  private loadMunicipalities(): void {
    this.errorMsg.set('');

    this.admin.getMunicipalities().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;

        const list = Array.isArray(data)
          ? data
          : data?.municipalities ?? [];

        this.municipalities.set(list);

        if (list.length === 0) {
          this.errorMsg.set(
            'কোনো Municipality পাওয়া যায়নি। API response পরীক্ষা করুন।'
          );
        }
      },
      error: (err: any) => {
        this.municipalities.set([]);
        this.errorMsg.set(
          err?.error?.message ||
          'Municipality তালিকা লোড করা যায়নি।'
        );
      },
    });
  }

  organizationName(user: any): string {
    if (user?.municipalityName) return user.municipalityName;
    if (user?.organizationName) return user.organizationName;

    const municipality = this.municipalities().find(
      (m: any) =>
        Number(m.id) === Number(
          user?.municipalityId ?? this.selectedMunicipalityId
        )
    );

    if (municipality) {
      return municipality.nameBn ||
        municipality.nameEn ||
        municipality.name ||
        municipality.code ||
        '—';
    }

    return '—';
  }

  createCitizen(): void {
    if (this.isPlatformAdmin() || this.creatingCitizen()) {
      return;
    }

    const form = this.citizenForm;

    if (!form.nameBn?.trim()) {
      this.errorMsg.set('নাগরিকের বাংলা নাম লিখুন।');
      return;
    }

    if (!form.mobile?.trim()) {
      this.errorMsg.set('মোবাইল নম্বর লিখুন।');
      return;
    }

    if (form.email?.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(form.email.trim())) {
        this.errorMsg.set('সঠিক ইমেইল ঠিকানা লিখুন।');
        return;
      }
    }

    const lastFourFields: Array<[string, string]> = [
      ['NID', form.nidLast4],
      ['জন্মনিবন্ধন', form.birthRegLast4],
      ['পাসপোর্ট', form.passportLast4],
      ['ড্রাইভিং লাইসেন্স', form.drivingLicenseLast4],
    ];

    for (const [label, value] of lastFourFields) {
      if (value && !/^\d{4}$/.test(value.trim())) {
        this.errorMsg.set(`${label}-এর শেষ ৪টি সংখ্যা লিখুন।`);
        return;
      }
    }

    const payload: any = {
      nameBn: form.nameBn.trim(),
      mobile: form.mobile.trim(),
      entryLanguage: form.entryLanguage || 'BN',
      hasSpouse: !!form.hasSpouse,
    };

    const optionalTextFields = [
      'nameEn',
      'email',
      'fatherNameBn',
      'fatherNameEn',
      'motherNameBn',
      'motherNameEn',
      'designationBn',
      'designationEn',
      'officeBn',
      'officeEn',
      'nidLast4',
      'birthRegLast4',
      'passportLast4',
      'drivingLicenseLast4',
    ];

    for (const field of optionalTextFields) {
      const value = form[field]?.trim();
      if (value) {
        payload[field] = value;
      }
    }

    if (form.dateOfBirth) {
      payload.dateOfBirth = form.dateOfBirth;
    }

    if (form.genderId !== null && form.genderId !== '') {
      const genderId = Number(form.genderId);

      if (!Number.isInteger(genderId) || genderId <= 0) {
        this.errorMsg.set('সঠিক Gender ID লিখুন।');
        return;
      }

      payload.genderId = genderId;
    }

    if (form.hasSpouse) {
      if (form.spouseNameBn?.trim()) {
        payload.spouseNameBn = form.spouseNameBn.trim();
      }

      if (form.spouseNameEn?.trim()) {
        payload.spouseNameEn = form.spouseNameEn.trim();
      }
    }

    // Municipality ID is intentionally not accepted from this form.
    // The backend must derive the municipality from authenticated context.
    this.creatingCitizen.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.admin.createCitizen(payload).subscribe({
      next: (res: any) => {
        if (res?.success === false) {
          this.errorMsg.set(
            res?.message || 'নাগরিক সংরক্ষণ করা যায়নি।'
          );
          this.creatingCitizen.set(false);
          return;
        }

        this.citizenForm = this.emptyCitizenForm();
        this.showCitizenForm.set(false);

        this.successMsg.set(
          'নাগরিক সফলভাবে সংরক্ষণ হয়েছে।'
        );

        this.creatingCitizen.set(false);

        // Refresh the current Municipality User's list.
        this.search();
      },

      error: (err: any) => {
        const validationErrors = err?.error?.data;

        if (
          validationErrors &&
          typeof validationErrors === 'object'
        ) {
          this.errorMsg.set(
            Object.entries(validationErrors)
              .map(([field, message]) => `${field}: ${String(message)}`)
              .join(' | ')
          );
        } else {
          this.errorMsg.set(
            err?.error?.message ||
            'নাগরিক সংরক্ষণ ব্যর্থ হয়েছে। তথ্য যাচাই করে আবার চেষ্টা করুন।'
          );
        }

        this.creatingCitizen.set(false);
      },
    });
  }

  paginatedUsers(): any[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.users().slice(start, start + this.pageSize);
  }

  totalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.users().length / this.pageSize)
    );
  }

  pageNumbers(): number[] {
    return Array.from(
      { length: this.totalPages() },
      (_, index) => index + 1
    );
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  search(): void {
    const mobile = this.mobile.trim();
    const name = this.name.trim();
    const verificationStatus = this.verificationStatus;

    const hasTextFilter =
      !!mobile || !!name || !!verificationStatus;

    const hasMunicipalityFilter =
      this.isPlatformAdmin() &&
      this.selectedMunicipalityId !== null;

    if (
      this.isPlatformAdmin() &&
      !hasTextFilter &&
      !hasMunicipalityFilter
    ) {
      this.errorMsg.set(
        'Municipality নির্বাচন করুন অথবা একটি Search Filter দিন।'
      );
      this.users.set([]);
      this.currentPage.set(1);
      this.hasSearched.set(false);
      return;
    }

    this.searching.set(true);
    this.errorMsg.set('');
    // Do not erase a just-created citizen's success message here.

    this.admin.searchCitizens({
      mobile: mobile || undefined,
      name: name || undefined,
      verificationStatus: verificationStatus || undefined,
      municipalityId: this.isPlatformAdmin()
        ? this.selectedMunicipalityId ?? undefined
        : undefined,
    }).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const list = Array.isArray(data)
          ? data
          : data?.users ?? data?.content ?? [];

        this.users.set(list);
        this.currentPage.set(1);
        this.hasSearched.set(true);
        this.searching.set(false);
      },
      error: (err: any) => {
        this.users.set([]);
        this.currentPage.set(1);
        this.hasSearched.set(true);
        this.errorMsg.set(
          err?.error?.message || 'ব্যবহারকারী খোঁজা যায়নি।'
        );
        this.searching.set(false);
      },
    });
  }

  clearSearch(): void {
    this.mobile = '';
    this.name = '';
    this.verificationStatus = '';

    this.users.set([]);
    this.currentPage.set(1);
    this.hasSearched.set(false);
    this.errorMsg.set('');
    this.successMsg.set('');

    if (!this.isPlatformAdmin()) {
      this.search();
    }
  }

  viewProfile(u: any): void {
    const id = u.id || u.userId;

    this.admin.getProfile(id).subscribe({
      next: (res: any) => {
        this.profile.set(res?.data || res);
      },
      error: (err: any) => {
        this.errorMsg.set(
          err?.error?.message || 'প্রোফাইল লোড ব্যর্থ।'
        );
      },
    });
  }

  viewRoles(u: any): void {
    const id = u.id || u.userId;

    this.rolesLoading.set(true);
    this.userRoles.set([]);

    this.admin.getUserRoles(id).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res)
          ? res
          : res?.data?.roles ??
            res?.data ??
            res?.roles ??
            [];

        this.userRoles.set(
          Array.isArray(list) ? list : []
        );

        this.rolesLoading.set(false);
      },
      error: (err: any) => {
        this.rolesLoading.set(false);
        this.userRoles.set(null);
        this.errorMsg.set(
          err?.error?.message || 'রোল লোড ব্যর্থ।'
        );
      },
    });
  }

  statusLabel(s: string): string {
    const labels: Record<string, string> = {
      ACTIVE: 'সক্রিয়',
      VERIFIED: 'যাচাইকৃত',
      UNVERIFIED: 'যাচাই হয়নি',
      PENDING: 'অপেক্ষমাণ',
      SUSPENDED: 'সাসপেন্ড',
      INACTIVE: 'নিষ্ক্রিয়',
    };

    return labels[s] || s || '—';
  }

  statusClass(s: string): string {
    const classes: Record<string, string> = {
      ACTIVE: 'badge-success',
      VERIFIED: 'badge-success',
      UNVERIFIED: 'badge-warning',
      PENDING: 'badge-warning',
      SUSPENDED: 'badge-warning',
      INACTIVE: 'badge-secondary',
    };

    return classes[s] || 'badge-secondary';
  }
}
