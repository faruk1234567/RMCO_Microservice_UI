
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  step = signal(1);
  loading = signal(false);
  errorMsg = signal('');
  infoMsg = signal('');

  policyAccepted = false;

  mobile = '';
  otp = '';
  otpToken = '';

  nameBn = '';
  nameEn = '';
  password = '';
  password2 = '';
  email = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  next(): void {
    this.errorMsg.set('');
    this.infoMsg.set('');

    // STEP 1: Policy -> Mobile
    if (this.step() === 1) {
      if (!this.policyAccepted) {
        this.errorMsg.set('নীতিমালায় সম্মতি দিন।');
        return;
      }

      this.step.set(2);
      return;
    }

    // STEP 2: Check mobile -> Send OTP
    if (this.step() === 2) {
      this.mobile = this.mobile.trim();

      if (!/^01[3-9]\d{8}$/.test(this.mobile)) {
        this.errorMsg.set('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)।');
        return;
      }

      this.loading.set(true);

      this.auth.checkMobileDuplicate(this.mobile).subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          const exists = data?.exists === true;

          if (exists) {
            this.loading.set(false);
            this.errorMsg.set(
              'এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একাউন্ট আছে।'
            );
            return;
          }

          this.auth.requestOtp(
            this.mobile,
            'REGISTRATION'
          ).subscribe({
            next: () => {
              this.loading.set(false);
              this.infoMsg.set(
                'OTP পাঠানো হয়েছে। মোবাইল চেক করুন।'
              );
              this.step.set(3);
            },
            error: (err) => {
              this.loading.set(false);
              this.errorMsg.set(
                this.extractError(err) || 'OTP পাঠাতে সমস্যা হয়েছে।'
              );
            },
          });
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMsg.set(
            this.extractError(err) || 'মোবাইল যাচাই ব্যর্থ।'
          );
        },
      });

      return;
    }

    // STEP 3: Verify OTP
    if (this.step() === 3) {
      if (!/^\d{6}$/.test(this.otp.trim())) {
        this.errorMsg.set('৬ সংখ্যার সঠিক OTP কোড দিন।');
        return;
      }

      this.loading.set(true);

      this.auth.verifyOtp(
        this.mobile,
        this.otp.trim(),
        'REGISTRATION'
      ).subscribe({
        next: (res: any) => {
          this.loading.set(false);

          const data = res?.data ?? res;

          if (data?.valid === false || data?.success === false) {
            this.errorMsg.set('OTP সঠিক নয়।');
            return;
          }

          this.otpToken = data?.registrationToken || '';

          if (!this.otpToken) {
            this.errorMsg.set(
              'Registration token পাওয়া যায়নি। OTP verification response পরীক্ষা করুন।'
            );
            return;
          }

          this.infoMsg.set('OTP যাচাই সফল হয়েছে।');
          this.step.set(4);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMsg.set(
            this.extractError(err) || 'OTP যাচাই ব্যর্থ।'
          );
        },
      });

      return;
    }
  }

  prev(): void {
    this.errorMsg.set('');
    this.infoMsg.set('');

    this.step.update((s) => Math.max(s - 1, 1));
  }

  submit(): void {
    this.errorMsg.set('');
    this.infoMsg.set('');

    if (this.step() !== 4) {
      this.errorMsg.set('আগে OTP যাচাই সম্পন্ন করুন।');
      return;
    }

    if (!this.otpToken) {
      this.errorMsg.set('Registration token পাওয়া যায়নি। আবার OTP যাচাই করুন।');
      return;
    }

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

    if (!this.policyAccepted) {
      this.errorMsg.set('নীতিমালায় সম্মতি দিন।');
      return;
    }

    this.loading.set(true);

    this.auth.register({
      // Global Citizen: municipalityId intentionally omitted
      mobile: this.mobile,
      registrationToken: this.otpToken,
      password: this.password,
      confirmPassword: this.password2,
      policyAccepted: this.policyAccepted,
      nameBn: this.nameBn.trim(),
      nameEn: this.nameEn.trim() || undefined,
      email: this.email.trim() || undefined,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        alert('নিবন্ধন সম্পন্ন! এখন লগইন করুন।');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(
          this.extractError(err) || 'নিবন্ধন ব্যর্থ।'
        );
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
