
import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { Municipality } from '../core/models/user.model';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit {
  showAdminMenu = signal(false);
  municipalities = signal<Municipality[]>([]);
  municipalityLoading = signal(false);

  userName = computed(() => {
    const u = this.auth.currentUser();
    return u?.nameBn || u?.nameEn || 'ব্যবহারকারী';
  });

  municipality = computed(() => {
    const user = this.auth.currentUser();
    const municipalityId = user?.municipalityId;

    if (municipalityId == null) {
      return 'প্ল্যাটফর্ম প্রশাসক';
    }

    const found = this.municipalities().find(
      (m: any) => String(m.municipalityId ?? m.id) === String(municipalityId)
    );

    return found
      ? ((found as any).nameBn || (found as any).nameEn || 'পৌরসভা')
      : (this.municipalityLoading() ? 'লোড হচ্ছে...' : 'পৌরসভার তথ্য পাওয়া যায়নি');
  });

  isAdmin = computed(() =>
    this.auth.hasAnyRole(
      'MUNICIPALITY_ADMIN',
      'PLATFORM_ADMIN',
      'ADMIN',
      'SUPER_ADMIN'
    )
  );

  isApprover = computed(() =>
    this.auth.hasAnyRole(
      'APPROVER',
      'MUNICIPALITY_ADMIN',
      'SECRETARY',
      'MAYOR',
      'ADMIN'
    )
  );

  navItems = computed(() => {
    const items = [
      { path: '/dashboard', label: 'HOME' },
      { path: '/committee', label: 'কমিটি' },
    ];

    if (this.isApprover()) {
      items.push({ path: '/workflow', label: 'অনুমোদন' });
    }

    items.push({ path: '/document', label: 'নথি' });
    return items;
  });

  adminItems = [
    { path: '/admin/roles', label: 'রোল ব্যবস্থাপনা' },
    { path: '/admin/users', label: 'ব্যবহারকারী' },
    { path: '/admin/invites', label: 'ইনভাইট' },
    { path: '/admin/lookups', label: 'Lookup / মাস্টার' },
    { path: '/config/types', label: 'কমিটির ধরন' },
    { path: '/config/routes', label: 'অনুমোদন রুট' },
    { path: '/config/designations', label: 'পদবী' },
    { path: '/config/scopes', label: 'কার্যপরিধি' },
    { path: '/audit', label: 'অডিট লগ' },
    {
  label: 'Municipality Management',
  path: '/admin/municipalities'
},
  ];

  constructor(public auth: AuthService) {}

  ngOnInit(): void {
    this.loadMunicipalities();
  }

  private loadMunicipalities(): void {
    this.municipalityLoading.set(true);

    this.auth.getMunicipalitiesForRegistration().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        this.municipalities.set(Array.isArray(data) ? data : []);
        this.municipalityLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load municipalities', err);
        this.municipalityLoading.set(false);
      },
    });
  }

  toggleAdminMenu(): void {
    this.showAdminMenu.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
  }
}
