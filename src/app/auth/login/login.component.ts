import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  loginId = '';
  password = '';
  loginMode: 'default' | 'select' | 'platform' = 'default';
  selectedMunicipality = '';
  loading = signal(false);
  errorMsg = signal('');

  // When backend returns multiple municipalities
  needsMunicipalitySelect = signal(false);
  availableMunicipalities = signal<{ id: string; nameBn: string; nameEn?: string }[]>([]);
  loginToken = ''; // temporary token before municipality select

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    this.errorMsg.set('');
    if (!this.loginId.trim() || !this.password.trim()) {
      this.errorMsg.set('আইডি এবং পাসওয়ার্ড দিতে হবে।');
      return;
    }

    this.loading.set(true);

    // If already in municipality-select step
    if (this.needsMunicipalitySelect()) {
      if (!this.selectedMunicipality) {
        this.loading.set(false);
        this.errorMsg.set('পৌরসভা নির্বাচন করুন।');
        return;
      }
      this.auth.selectMunicipality({
        loginToken: this.loginToken,
        municipalityId: this.selectedMunicipality,
      }).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMsg.set(this.extractError(err));
        },
      });
      return;
    }

    // Normal login
  // Login API নির্বাচন
const loginRequest = {
  loginId: this.loginId.trim(),
  password: this.password,
};

const login$ =
  this.loginMode === 'platform'
    ? this.auth.platformLogin(loginRequest)
    : this.auth.login(loginRequest);

login$.subscribe({
      next: (res) => {
        this.loading.set(false);

        // Backend may return list of municipalities when user has multiple
        const munis = res.municipalities || res.data?.municipalities || res.availableMunicipalities;
        const needsSelect = res.needsMunicipalitySelection || res.requireMunicipality || (Array.isArray(munis) && munis.length > 1);

        if (needsSelect && munis?.length) {
          this.loginToken = res.loginToken || res.tempToken || res.token || '';
          this.availableMunicipalities.set(
            munis.map((m: any) => ({
              id: m.id || m.municipalityId,
              nameBn: m.nameBn || m.name_bn || m.name,
              nameEn: m.nameEn || m.name_en,
            }))
          );
          this.needsMunicipalitySelect.set(true);
          this.loginMode = 'select';
          return;
        }

        // Single municipality or already logged in
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(this.extractError(err));
      },
    });
  }

  private extractError(err: any): string {
    return (
      err?.error?.message ||
      err?.error?.error ||
      err?.error?.title ||
      (typeof err?.error === 'string' ? err.error : null) ||
      'লগইন ব্যর্থ। আইডি/পাসওয়ার্ড ঠিক আছে কিনা দেখুন।'
    );
  }
}
