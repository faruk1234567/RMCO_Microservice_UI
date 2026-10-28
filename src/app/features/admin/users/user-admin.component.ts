
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

type AddrKey = 'present' | 'permanent';

interface GeoLists {
  districts: any[];
  upazilas: any[];
  unions: any[];
  wards: any[];
}

const emptyGeo = (): GeoLists => ({
  districts: [],
  upazilas: [],
  unions: [],
  wards: [],
});

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
              <p class="form-note">* চিহ্নিত ফিল্ডগুলো আবশ্যক।</p>

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
                    <label>লিঙ্গ</label>
                    <select
                      class="form-control"
                      name="gender"
                      [(ngModel)]="citizenForm.gender"
                    >
                      <option value="">-- নির্বাচন করুন --</option>
                      <option value="MALE">পুরুষ</option>
                      <option value="FEMALE">মহিলা</option>
                      <option value="OTHER">অন্যান্য</option>
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

                <!-- Reusable address fields -->
                <ng-template #addressFields let-key>
                  <div class="citizen-form-grid">
                    <div class="form-group">
                      <label>বিভাগ</label>
                      <select
                        class="form-control"
                        [name]="key + '_divisionId'"
                        [ngModel]="citizenForm[key].divisionId"
                        (ngModelChange)="onDivisionChange(key, $event)"
                      >
                        <option [ngValue]="null">-- বিভাগ নির্বাচন করুন --</option>
                        @for (d of divisions(); track d.id) {
                          <option [ngValue]="d.id">{{ geoName(d) }}</option>
                        }
                      </select>
                    </div>

                    <div class="form-group">
                      <label>জেলা</label>
                      <select
                        class="form-control"
                        [name]="key + '_districtId'"
                        [ngModel]="citizenForm[key].districtId"
                        (ngModelChange)="onDistrictChange(key, $event)"
                        [disabled]="!citizenForm[key].divisionId"
                      >
                        <option [ngValue]="null">-- জেলা নির্বাচন করুন --</option>
                        @for (d of geoOf(key).districts; track d.id) {
                          <option [ngValue]="d.id">{{ geoName(d) }}</option>
                        }
                      </select>
                    </div>

                    <div class="form-group">
                      <label>উপজেলা</label>
                      <select
                        class="form-control"
                        [name]="key + '_upazilaId'"
                        [ngModel]="citizenForm[key].upazilaId"
                        (ngModelChange)="onUpazilaChange(key, $event)"
                        [disabled]="!citizenForm[key].districtId"
                      >
                        <option [ngValue]="null">-- উপজেলা নির্বাচন করুন --</option>
                        @for (u of geoOf(key).upazilas; track u.id) {
                          <option [ngValue]="u.id">{{ geoName(u) }}</option>
                        }
                      </select>
                    </div>

                    <div class="form-group">
                      <label>ইউনিয়ন</label>
                      <select
                        class="form-control"
                        [name]="key + '_unionId'"
                        [ngModel]="citizenForm[key].unionId"
                        (ngModelChange)="onUnionChange(key, $event)"
                        [disabled]="!citizenForm[key].upazilaId"
                      >
                        <option [ngValue]="null">-- ইউনিয়ন নির্বাচন করুন --</option>
                        @for (u of geoOf(key).unions; track u.id) {
                          <option [ngValue]="u.id">{{ geoName(u) }}</option>
                        }
                      </select>
                    </div>

                    <div class="form-group">
                      <label>ওয়ার্ড নং</label>
                      <select
                        class="form-control"
                        [name]="key + '_wardId'"
                        [(ngModel)]="citizenForm[key].wardId"
                        [disabled]="!citizenForm[key].unionId"
                      >
                        <option [ngValue]="null">-- ওয়ার্ড নির্বাচন করুন --</option>
                        @for (w of geoOf(key).wards; track w.id) {
                          <option [ngValue]="w.id">{{ geoName(w) }}</option>
                        }
                      </select>
                    </div>

                    <div class="form-group">
                      <label>রাস্তা নং</label>
                      <input
                        class="form-control"
                        [name]="key + '_roadNo'"
                        [(ngModel)]="citizenForm[key].roadNo"
                        maxlength="50"
                      />
                    </div>

                    <div class="form-group">
                      <label>রাস্তার নাম</label>
                      <input
                        class="form-control"
                        [name]="key + '_roadName'"
                        [(ngModel)]="citizenForm[key].roadName"
                        maxlength="200"
                      />
                    </div>

                    <div class="form-group">
                      <label>হোল্ডিং নং</label>
                      <input
                        class="form-control"
                        [name]="key + '_holdingNo'"
                        [(ngModel)]="citizenForm[key].holdingNo"
                        maxlength="50"
                      />
                    </div>

                    <div class="form-group">
                      <label>ডাকঘর</label>
                      <input
                        class="form-control"
                        [name]="key + '_postOffice'"
                        [(ngModel)]="citizenForm[key].postOffice"
                        maxlength="200"
                      />
                    </div>

                    <div class="form-group">
                      <label>পোস্ট কোড</label>
                      <input
                        class="form-control"
                        [name]="key + '_postCode'"
                        [(ngModel)]="citizenForm[key].postCode"
                        inputmode="numeric"
                        maxlength="10"
                      />
                    </div>
                  </div>
                </ng-template>

                <h3>বর্তমান ঠিকানা</h3>
                <ng-container
                  *ngTemplateOutlet="addressFields; context: { $implicit: 'present' }"
                ></ng-container>

                <h3>স্থায়ী ঠিকানা</h3>

                <div class="citizen-form-grid">
                  <div class="form-group spouse-checkbox">
                    <label>
                      <input
                        type="checkbox"
                        name="sameAsPresent"
                        [(ngModel)]="citizenForm.sameAsPresent"
                      />
                      স্থায়ী ঠিকানা বর্তমান ঠিকানার মতোই (Same as present address)
                    </label>
                  </div>
                </div>

                @if (!citizenForm.sameAsPresent) {
                  <ng-container
                    *ngTemplateOutlet="addressFields; context: { $implicit: 'permanent' }"
                  ></ng-container>
                }

                <h3>পরিচয়পত্রের তথ্য</h3>

                <div class="citizen-form-grid">
                  <div class="form-group">
                    <label>NID নম্বর</label>
                    <input
                      class="form-control"
                      name="nid"
                      [(ngModel)]="citizenForm.nid"
                      inputmode="numeric"
                      maxlength="20"
                      placeholder="পূর্ণ NID নম্বর লিখুন"
                    />
                  </div>

                  <div class="form-group">
                    <label>জন্মনিবন্ধন নম্বর</label>
                    <input
                      class="form-control"
                      name="birthRegistrationNumber"
                      [(ngModel)]="citizenForm.birthRegistrationNumber"
                      inputmode="numeric"
                      maxlength="20"
                      placeholder="পূর্ণ জন্মনিবন্ধন নম্বর লিখুন"
                    />
                  </div>

                  <div class="form-group">
                    <label>পাসপোর্ট নম্বর</label>
                    <input
                      class="form-control"
                      name="passportNumber"
                      [(ngModel)]="citizenForm.passportNumber"
                      maxlength="30"
                      placeholder="পূর্ণ পাসপোর্ট নম্বর লিখুন"
                    />
                  </div>

                  <div class="form-group">
                    <label>ড্রাইভিং লাইসেন্স নম্বর</label>
                    <input
                      class="form-control"
                      name="drivingLicenseNumber"
                      [(ngModel)]="citizenForm.drivingLicenseNumber"
                      maxlength="30"
                      placeholder="পূর্ণ লাইসেন্স নম্বর লিখুন"
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
                    <option [ngValue]="null">-- সব Municipality / নির্বাচন করুন --</option>
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
                            <span class="badge" [ngClass]="statusClass(u.verificationStatus)">
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
                    @for (r of userRoles()!; track r.id || r.roleId || r.code || $index) {
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
      margin-top: -32px;
    }

    .page-container {
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }

    .page-header {
      flex: 0 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      min-height: 30px;
      padding: 0 0 4px;
    }

    .page-header .btn {
      padding: 3px 14px;
      font-size: 0.82rem;
    }

    .page-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 2px 4px 8px 0;
    }

    .page-body > * {
      flex-shrink: 0;
    }

    .page-header h1 {
      margin: 0;
      font-size: 1.02rem;
      font-weight: 700;
      color: #0a5c36;
    }

    .page-header h1::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      margin-right: 8px;
      border: 2px solid #0a5c36;
      border-radius: 50%;
      vertical-align: middle;
    }

    .alert {
      margin: 0;
      padding: 5px 10px;
      font-size: 0.85rem;
    }

    .citizen-create-card,
    .citizen-create-card.card {
      margin: 0;
      overflow: visible;
      background: transparent;
      border: 0;
      box-shadow: none;
    }

    .citizen-create-card .card-body {
      padding: 0;
    }

    .citizen-create-card h2 {
      display: inline-block;
      margin: 0 0 4px;
      font-size: 0.88rem;
      font-weight: 700;
      color: #1f2937;
    }

    .form-note {
      display: inline-block;
      margin: 0 0 0 10px;
      color: #6b7280;
      font-size: 0.74rem;
    }

    .citizen-create-card h3 {
      margin: 6px 0 0;
      padding: 3px 8px;
      text-align: center;
      background: #eef2f1;
      border: 1px solid #d9e2dd;
      border-bottom: 0;
      font-size: 0.8rem;
      font-weight: 600;
      color: #374151;
    }

    .citizen-form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      border-top: 1px solid #d9e2dd;
      border-left: 1px solid #d9e2dd;
      background: #fff;
    }

    .citizen-form-grid .form-group {
      display: grid;
      grid-template-columns: 38% 62%;
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
      padding: 2px 8px;
      background: #f1f5f4;
      font-size: 0.8rem;
      line-height: 1.2;
    }

    .citizen-form-grid .form-control {
      align-self: center;
      width: calc(100% - 10px);
      height: 26px;
      min-height: 0;
      margin: 2px 5px;
      padding: 1px 8px;
      font-size: 0.8rem;
      line-height: 1.2;
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
      padding: 3px 8px;
    }

    .citizen-form-actions {
      position: sticky;
      bottom: 0;
      z-index: 5;
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 8px;
      margin: 8px 0 0;
      padding: 6px 0;
      background: #eff4f1;
      border-top: 1px solid #d9e2dd;
    }

    .citizen-form-actions .btn {
      padding: 3px 14px;
      font-size: 0.82rem;
    }

    .search-card {
      margin: 0;
    }

    .search-card .card-body {
      padding: 12px;
    }

    .municipality-field {
      max-width: 480px;
      margin-bottom: 12px;
    }

    .grow {
      flex: 1 1 180px;
      min-width: 0;
    }

    .search-row {
      display: flex;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 10px;
    }

    .search-row .form-group {
      margin-bottom: 0;
    }

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

    .results-card {
      margin: 0;
    }

    .results-body {
      padding: 0 12px 10px;
    }

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

    .citizen-count span {
      font-weight: 700;
      font-size: 1rem;
    }

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

    .page-button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

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

    .modal-header h3 {
      margin: 0;
      color: #0a5c36;
    }

    .modal-body {
      padding: 20px;
    }

    .profile-json {
      background: #f5f9f6;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.82rem;
      overflow-wrap: anywhere;
      max-height: 400px;
      overflow: auto;
    }

    .role-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

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

    @media (max-width: 900px) {
      .data-table th,
      .data-table td {
        padding: 5px 3px;
        font-size: 0.7rem;
      }

      .table-footer {
        justify-content: center;
      }
    }

    @media (max-width: 650px) {
      .citizen-form-grid {
        grid-template-columns: minmax(0, 1fr);
      }

      .citizen-form-actions button {
        flex: 1 1 auto;
      }
    }
  `],
})
export class UserAdminComponent implements OnInit, AfterViewInit, OnDestroy {
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

  showCitizenForm = signal(false);
  creatingCitizen = signal(false);

  divisions = signal<any[]>([]);
  geo = signal<Record<AddrKey, GeoLists>>({
    present: emptyGeo(),
    permanent: emptyGeo(),
  });

  citizenForm: any = this.emptyCitizenForm();

  constructor(
    private admin: AdminService,
    private auth: AuthService,
    private host: ElementRef<HTMLElement>
  ) {}

  ngAfterViewInit(): void {
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

    this.loadDivisions();
  }

  private emptyCitizenForm(): any {
    return {
      nameBn: '',
      nameEn: '',
      mobile: '',
      email: '',
      dateOfBirth: '',
      gender: '',
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
      nid: '',
      birthRegistrationNumber: '',
      passportNumber: '',
      drivingLicenseNumber: '',
      entryLanguage: 'BN',
      present: this.emptyAddress(),
      permanent: this.emptyAddress(),
      sameAsPresent: false,
    };
  }

  private emptyAddress(): any {
    return {
      divisionId: null,
      districtId: null,
      upazilaId: null,
      unionId: null,
      wardId: null,
      roadNo: '',
      roadName: '',
      holdingNo: '',
      postOffice: '',
      postCode: '',
    };
  }

  toggleCitizenForm(): void {
    if (this.isPlatformAdmin() || this.creatingCitizen()) {
      return;
    }

    const opening = !this.showCitizenForm();

    this.errorMsg.set('');
    this.successMsg.set('');
    this.showCitizenForm.set(opening);

    if (opening) {
      this.citizenForm = this.emptyCitizenForm();
      this.resetGeo();
      this.loadDivisions();
    }
  }

  resetCitizenForm(form?: { resetForm: () => void }): void {
    this.citizenForm = this.emptyCitizenForm();
    this.resetGeo();
    form?.resetForm();
    this.errorMsg.set('');
  }

  // ---------- Address dropdowns ----------

  geoName(item: any): string {
    return item?.nameBn || item?.nameEn || item?.name || item?.code || '—';
  }

  geoOf(key: string): GeoLists {
    return this.geo()[key as AddrKey];
  }

  private patchGeo(key: AddrKey, patch: Partial<GeoLists>): void {
    this.geo.update((g) => ({
      ...g,
      [key]: { ...g[key], ...patch },
    }));
  }

  private resetGeo(): void {
    this.geo.set({
      present: emptyGeo(),
      permanent: emptyGeo(),
    });
  }

  private extractList(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.content)) return res.data.content;
    if (Array.isArray(res?.content)) return res.content;
    return [];
  }

  loadDivisions(): void {
    this.admin.getLookup('DIVISION').subscribe({
      next: (res: any) => {
           console.log('DIVISION API RESPONSE:', res);
        const list = this.extractList(res);
        this.divisions.set(list);
        console.log('DIVISION LIST:', list);

        if (!list.length) {
          console.warn('Division API returned an empty list:', res);
        }
      },
      error: (err: any) => {
        console.error('DIVISION API ERROR:', err.status, err.error);
        this.divisions.set([]);
        this.errorMsg.set(
          `বিভাগ লোড করা যায়নি। HTTP ${err.status ?? 'Unknown'}`
        );
      },
    });
  }

  onDivisionChange(key: AddrKey, id: number | string | null): void {
    const address = this.citizenForm[key];

    address.divisionId = id || null;
    address.districtId = null;
    address.upazilaId = null;
    address.unionId = null;
    address.wardId = null;

    this.patchGeo(key, {
      districts: [],
      upazilas: [],
      unions: [],
      wards: [],
    });

    if (id === null || id === undefined || id === '') return;

    this.admin.getLookupChildren(id).subscribe({
      next: (res: any) => {
        this.patchGeo(key, {
          districts: this.extractList(res),
        });
      },
      error: (err: any) => {
        console.error('DISTRICT API ERROR:', err.status, err.error);
        this.errorMsg.set('জেলার তালিকা লোড করা যায়নি।');
      },
    });
  }

  onDistrictChange(key: AddrKey, id: number | string | null): void {
    const address = this.citizenForm[key];

    address.districtId = id || null;
    address.upazilaId = null;
    address.unionId = null;
    address.wardId = null;

    this.patchGeo(key, {
      upazilas: [],
      unions: [],
      wards: [],
    });

    if (id === null || id === undefined || id === '') return;

    this.admin.getLookupChildren(id).subscribe({
      next: (res: any) => {
        this.patchGeo(key, {
          upazilas: this.extractList(res),
        });
      },
      error: (err: any) => {
        console.error('UPAZILA API ERROR:', err.status, err.error);
        this.errorMsg.set('উপজেলার তালিকা লোড করা যায়নি।');
      },
    });
  }

  onUpazilaChange(key: AddrKey, id: number | string | null): void {
    const address = this.citizenForm[key];

    address.upazilaId = id || null;
    address.unionId = null;
    address.wardId = null;

    this.patchGeo(key, {
      unions: [],
      wards: [],
    });

    if (id === null || id === undefined || id === '') return;

    this.admin.getLookupChildren(id).subscribe({
      next: (res: any) => {
        this.patchGeo(key, {
          unions: this.extractList(res),
        });
      },
      error: (err: any) => {
        console.error('UNION API ERROR:', err.status, err.error);
        this.errorMsg.set('ইউনিয়নের তালিকা লোড করা যায়নি।');
      },
    });
  }

  onUnionChange(key: AddrKey, id: number | string | null): void {
    const address = this.citizenForm[key];

    address.unionId = id || null;
    address.wardId = null;
    this.patchGeo(key, { wards: [] });

    if (id === null || id === undefined || id === '') return;

    this.admin.getWards(id).subscribe({
      next: (res: any) => {
        this.patchGeo(key, {
          wards: this.extractList(res),
        });
      },
      error: (err: any) => {
        console.error('WARD API ERROR:', err.status, err.error);
        this.patchGeo(key, { wards: [] });
      },
    });
  }

  private buildAddress(a: any): any | null {
    if (!a) return null;

    const out: any = {};

    for (const f of [
      'divisionId',
      'districtId',
      'upazilaId',
      'unionId',
      'wardId',
    ]) {
      if (a[f] !== null && a[f] !== undefined && a[f] !== '') {
        out[f] = a[f];
      }
    }

    for (const f of [
      'roadNo',
      'roadName',
      'holdingNo',
      'postOffice',
      'postCode',
    ]) {
      const v = a[f]?.toString().trim();
      if (v) out[f] = v;
    }

    return Object.keys(out).length ? out : null;
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

        if (!list.length) {
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
    if (this.isPlatformAdmin() || this.creatingCitizen()) return;

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

    const digitsOnlyFields: Array<[string, string]> = [
      ['NID নম্বর', form.nid],
      ['জন্মনিবন্ধন নম্বর', form.birthRegistrationNumber],
    ];

    for (const [label, value] of digitsOnlyFields) {
      if (value && !/^\d+$/.test(value.trim())) {
        this.errorMsg.set(`${label} শুধু ইংরেজি সংখ্যায় লিখুন।`);
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
      'gender',
      'nid',
      'birthRegistrationNumber',
      'passportNumber',
      'drivingLicenseNumber',
    ];

    for (const field of optionalTextFields) {
      const value = form[field]?.trim();
      if (value) payload[field] = value;
    }

    if (form.dateOfBirth) {
      payload.dateOfBirth = form.dateOfBirth;
    }

    const presentAddress = this.buildAddress(form.present);

    if (presentAddress) {
      payload.presentAddress = presentAddress;
    }

    payload.permanentSameAsPresent = !!form.sameAsPresent;

    const permanentAddress = form.sameAsPresent
      ? presentAddress
      : this.buildAddress(form.permanent);

    if (permanentAddress) {
      payload.permanentAddress = permanentAddress;
    }

    if (form.hasSpouse) {
      if (form.spouseNameBn?.trim()) {
        payload.spouseNameBn = form.spouseNameBn.trim();
      }

      if (form.spouseNameEn?.trim()) {
        payload.spouseNameEn = form.spouseNameEn.trim();
      }
    }

    // Municipality ID is derived by the backend from authenticated context.
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
        this.resetGeo();
        this.showCitizenForm.set(false);

        this.successMsg.set('নাগরিক সফলভাবে সংরক্ষণ হয়েছে।');
        this.creatingCitizen.set(false);
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
    return Math.max(1, Math.ceil(this.users().length / this.pageSize));
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

        this.userRoles.set(Array.isArray(list) ? list : []);
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
