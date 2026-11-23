import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-branch-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branch-master.component.html',
  styleUrls: ['./branch-master.component.css']
})
export class BranchMasterComponent implements OnInit {
  branches: any[] = [];
  departments: any[] = [];
  branchList: any[] = [];
  parentList: any[] = [];
  loading = false;
  msg = '';

  form: any = { level: 'DEPARTMENT', nameBn: '', nameEn: '', parentId: null };
  editId: number | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.http.get<any>(`/tax-proposal-service/branches`).subscribe({
      next: (res) => {
        this.branches = res?.data ?? res ?? [];
        this.departments = this.branches.filter((b: any) => b.level === 'DEPARTMENT');
        this.branchList = this.branches.filter((b: any) => b.level === 'BRANCH');
        this.onLevelChange();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onLevelChange() {
    if (this.form.level === 'DEPARTMENT') {
      this.parentList = [];
      this.form.parentId = null;
    } else if (this.form.level === 'BRANCH') {
      this.parentList = this.departments;
    } else {
      this.parentList = this.branchList;
    }
    // Level বদলাইলে Parent আবার Select করতে হবে
    if (!this.editId) this.form.parentId = null;
  }

  parentName(id: any): string {
    if (!id) return '-';
    const p = this.branches.find((b: any) => b.id == id);
    return p ? p.nameBn : '-';
  }

  levelLabel(level: string): string {
    if (level === 'DEPARTMENT') return 'বিভাগ';
    if (level === 'BRANCH') return 'শাখা';
    return 'উপ-শাখা';
  }

  save() {
    if (!this.form.nameBn?.trim()) { this.msg = 'বাংলা নাম দেন'; return; }
    if (this.form.level !== 'DEPARTMENT' && !this.form.parentId) { this.msg = 'Parent শাখা Select করেন'; return; }
    this.msg = '';
    const body = { ...this.form };
    if (this.editId) {
      this.http.put(`/tax-proposal-service/branches/${this.editId}`, body).subscribe({
        next: () => { this.reset(); this.load(); this.msg = 'Update হইছে'; },
        error: (e) => this.msg = e?.error?.message || 'Save হয় নাই'
      });
    } else {
      this.http.post(`/tax-proposal-service/branches`, body).subscribe({
        next: () => { this.reset(); this.load(); this.msg = 'Save হইছে'; },
        error: (e) => this.msg = e?.error?.message || 'Save হয় নাই'
      });
    }
  }

  edit(b: any) {
    this.editId = b.id;
    this.form = { level: b.level, nameBn: b.nameBn, nameEn: b.nameEn || '', parentId: b.parentId ?? null };
    this.onLevelChange();
    // onLevelChange এ parentId মুছে যায়, আবার বসাই দিলাম
    this.form.parentId = b.parentId ?? null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  reset() {
    this.editId = null;
    this.form = { level: 'DEPARTMENT', nameBn: '', nameEn: '', parentId: null };
    this.onLevelChange();
  }
}