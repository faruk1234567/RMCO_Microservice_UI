
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';

interface PermissionItem {
  code: string;
  permissionGroup: string;
  labelBn: string;
  labelEn: string;
  isMenu: boolean;
  parentCode: string | null;
  sortOrder: number;
}

@Component({
  selector: 'app-permission-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-management.component.html',
  styleUrl: './permission-management.component.scss'
})
export class PermissionManagementComponent implements OnInit {
  permissions: PermissionItem[] = [];
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  form: PermissionItem = this.emptyForm();

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadPermissions();
  }

  private emptyForm(): PermissionItem {
    return {
      code: '',
      permissionGroup: '',
      labelBn: '',
      labelEn: '',
      isMenu: false,
      parentCode: null,
      sortOrder: 0
    };
  }

  loadPermissions(): void {
    this.loading = true;
    this.adminService.getPermissions().subscribe({
      next: (response: any) => {
        const result = response?.data ?? response?.result ?? response;
        this.permissions = Array.isArray(result) ? result : [];
        this.loading = false;
      },
      error: (error: any) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message || 'Permission list load করা যায়নি।';
      }
    });
  }

  savePermission(): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.form.code = this.form.code.trim().toLowerCase();
    this.form.permissionGroup = this.form.permissionGroup.trim();
    this.form.labelBn = this.form.labelBn.trim();
    this.form.labelEn = this.form.labelEn.trim();

    if (
      !this.form.code ||
      !this.form.permissionGroup ||
      !this.form.labelBn ||
      !this.form.labelEn
    ) {
      this.errorMessage = 'সবগুলো প্রয়োজনীয় ঘর পূরণ করুন।';
      return;
    }

    if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/.test(this.form.code)) {
      this.errorMessage = 'সঠিক Permission Code দিন, যেমন config.menu.view';
      return;
    }

    this.saving = true;

    this.adminService.createPermission({
      ...this.form,
      parentCode: this.form.parentCode?.trim() || null
    }).subscribe({
      next: (response: any) => {
        this.saving = false;

        if (response?.success === false) {
          this.errorMessage = response?.message || 'Permission তৈরি হয়নি।';
          return;
        }

        this.successMessage = 'Permission সফলভাবে তৈরি হয়েছে।';
        this.form = this.emptyForm();
        this.loadPermissions();
      },
      error: (error: any) => {
        this.saving = false;
        this.errorMessage =
          error?.error?.message || 'Permission তৈরি করা যায়নি।';
      }
    });
  }

  resetForm(): void {
    this.form = this.emptyForm();
    this.errorMessage = '';
    this.successMessage = '';
  }
}
