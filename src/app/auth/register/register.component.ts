import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface Muni {
  id: string;
  nameBn: string;
  nameEn?: string;
  formLanguage?: string;
  selfRegistrationEnabled?: boolean;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  step = signal(1);
  loading = signal(false);
  errorMsg = signal('');
  infoMsg = signal('');

  policyAccepted = false;
  municipalities: Muni[] = [];
  municipalityId = '';
  mobile = '';
  otp = '';
  otpToken = '';
  nameBn = '';
  nameEn = '';
  password = '';
  password2 = '';
  email = '';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.auth.getMunicipalitiesForRegistration().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data || res?.content || [];
        this.municipalities = list
          .filter((m: any) => m.selfRegistrationEnabled !== false)
          .map((m: any) => ({
            id: m.id || m.municipalityId,
            nameBn: m.nameBn || m.name_bn || m.name,
            nameEn: m.nameEn || m.name_en,
            formLanguage: m.formLanguage || m.form_language,
            selfRegistrationEnabled: m.selfRegistrationEnabled ?? true,
          }));
      },
      error: () => {
        this.errorMsg.set('পৌরসভা তালিকা লোড করা যায়নি।');
      },
    });
  }

  next() {
    this.errorMsg.set('');
    this.infoMsg.set('');

    if (this.step() === 2) {
      if (!this.municipalityId) {
        this.errorMsg.set('পৌরসভা নির্বাচন করুন।');
        return;
      }
      this.step.update((s) => s + 1);
      return;
    }

    if (this.step() === 3) {
      if (!/^01[3-9]\d{8}$/.test(this.mobile)) {
        this.errorMsg.set('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)।');
        return;
      }
      this.loading.set(true);
      // 1) check duplicate
      this.auth.checkMobileDuplicate(this.municipalityId, this.mobile).subscribe({
        next: (res: any) => {
          const exists = res.exists === true || res.data?.exists === true;
          if (exists) {
            this.loading.set(false);
            this.errorMsg.set('এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একাউন্ট আছে।');
            return;
          }
          // 2) send OTP
          this.auth.requestOtp(this.municipalityId, this.mobile, 'REGISTRATION').subscribe({
            next: () => {
              this.loading.set(false);
              this.infoMsg.set('OTP পাঠানো হয়েছে। মোবাইল চেক করুন।');
              this.step.update((s) => s + 1);
            },
            error: (err) => {
              this.loading.set(false);
              this.errorMsg.set(this.extractError(err) || 'OTP পাঠাতে সমস্যা হয়েছে।');
            },
          });
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMsg.set(this.extractError(err) || 'মোবাইল যাচাই ব্যর্থ।');
        },
      });
      return;
    }

    if (this.step() === 4) {
      if (this.otp.length < 4) {
        this.errorMsg.set('OTP কোড দিন।');
        return;
      }
      this.loading.set(true);
      this.auth.verifyOtp(this.municipalityId, this.mobile, this.otp, 'REGISTRATION').subscribe({
        next: (res: any) => {
          this.loading.set(false);
          const valid = res.valid !== false && res.success !== false;
          if (!valid && res.valid === false) {
            this.errorMsg.set('OTP সঠিক নয়।');
            return;
          }
          this.otpToken = res.data?.registrationToken || res.registrationToken || '';
          this.step.update((s) => s + 1);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMsg.set(this.extractError(err) || 'OTP যাচাই ব্যর্থ।');
        },
      });
      return;
    }

    this.step.update((s) => Math.min(s + 1, 5));
  }

  prev() {
    this.errorMsg.set('');
    this.infoMsg.set('');
    this.step.update((s) => Math.max(s - 1, 1));
  }

  submit() {
    this.errorMsg.set('');
    if (!this.nameBn.trim()) {
      this.errorMsg.set('নাম (বাংলা) আবশ্যক।');
      return;
    }
    if (this.password.length < 6) {
      this.errorMsg.set('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (this.password !== this.password2) {
      this.errorMsg.set('পাসওয়ার্ড মিলছে না।');
      return;
    }

    this.loading.set(true);
    this.auth
      .register({
        municipalityId: this.municipalityId,
        mobile: this.mobile,
        registrationToken: this.otpToken,
        password: this.password,
        confirmPassword: this.password2,
        policyAccepted: this.policyAccepted,
        nameBn: this.nameBn.trim(),
        nameEn: this.nameEn?.trim() || undefined,
        email: this.email?.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          alert('নিবন্ধন সম্পন্ন! এখন লগইন করুন।');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMsg.set(this.extractError(err) || 'নিবন্ধন ব্যর্থ।');
        },
      });
  }

  private extractError(err: any): string {
    return (
      err?.error?.message ||
      err?.error?.error ||
      err?.error?.title ||
      (typeof err?.error === 'string' ? err.error : '') ||
      ''
    );
  }
}
