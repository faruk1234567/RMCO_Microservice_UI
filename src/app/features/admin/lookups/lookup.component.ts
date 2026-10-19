import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Lookup / মাস্টার ডাটা</h1>
      </div>

      @if (errorMsg()) { <div class="alert alert-danger">{{ errorMsg() }}</div> }

      <div class="card mb-2">
        <div class="card-body">
          <div class="form-row" style="align-items:flex-end">
            <div class="form-group">
              <label>ক্যাটাগরি</label>
              <select class="form-control" [(ngModel)]="category">
                <option value="designations">Designations (পদবী)</option>
                <option value="gender">Gender</option>
                <option value="division">Division</option>
                <option value="district">District</option>
                <option value="upazila">Upazila</option>
                <option value="union">Union</option>
                <option value="post_office">Post Office</option>
                <option value="">-- কাস্টম --</option>
              </select>
            </div>
            @if (!category) {
              <div class="form-group">
                <label>কাস্টম ক্যাটাগরি</label>
                <input class="form-control" [(ngModel)]="customCategory" placeholder="category-code" />
              </div>
            }
            <div class="form-group">
              <label>Parent ID (children এর জন্য)</label>
              <input class="form-control" [(ngModel)]="parentId" placeholder="ঐচ্ছিক" />
            </div>
            <button class="btn btn-primary" [disabled]="loading()" (click)="load()">
              {{ loading() ? 'লোড...' : 'লোড করুন' }}
            </button>
            <button class="btn btn-secondary" [disabled]="loading()" (click)="loadDesignations()">
              Designations
            </button>
          </div>
        </div>
      </div>

      @if (items().length) {
        <div class="card">
          <div class="card-header">
            <h3>ফলাফল ({{ items().length }})</h3>
          </div>
          <div class="card-body table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>কোড</th>
                  <th>নাম (বাংলা)</th>
                  <th>English</th>
                  <th>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                @for (item of items(); track item.id || item.code || $index) {
                  <tr>
                    <td><code style="font-size:0.78rem">{{ item.id || '—' }}</code></td>
                    <td>{{ item.code || '—' }}</td>
                    <td>{{ item.nameBn || item.name_bn || item.name || '—' }}</td>
                    <td>{{ item.nameEn || item.name_en || '—' }}</td>
                    <td>
                      @if (item.id) {
                        <button class="btn btn-sm btn-secondary" (click)="loadChildren(item)">
                          Children
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (!loading() && loaded() && !items().length) {
        <div class="alert alert-info">কোনো ডাটা পাওয়া যায়নি।</div>
      }
    </div>
  `,
})
export class LookupComponent {
  category = 'designations';
  customCategory = '';
  parentId = '';
  items = signal<any[]>([]);
  loading = signal(false);
  loaded = signal(false);
  errorMsg = signal('');

  constructor(private auth: AuthService) {}

  private resolveCategory(): string {
    return this.category || this.customCategory.trim();
  }

  load() {
    const cat = this.resolveCategory();
    if (!cat) {
      this.errorMsg.set('ক্যাটাগরি দিন।');
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');
    this.loaded.set(false);

    const req$ = this.parentId
      ? this.auth.getLookupChildren(cat, this.parentId)
      : this.auth.getLookup(cat);

    req$.subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.content || res?.items || [];
        this.items.set(list);
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.loaded.set(true);
        this.items.set([]);
        this.errorMsg.set(err?.error?.message || 'লোড ব্যর্থ।');
      },
    });
  }

  loadDesignations() {
    this.loading.set(true);
    this.errorMsg.set('');
    this.auth.getDesignations().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.content || [];
        this.items.set(list);
        this.loading.set(false);
        this.loaded.set(true);
        this.category = 'designations';
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message || 'Designations লোড ব্যর্থ।');
      },
    });
  }

  loadChildren(item: any) {
    const cat = this.resolveCategory();
    if (!item.id || !cat) return;
    this.parentId = item.id;
    this.load();
  }
}
