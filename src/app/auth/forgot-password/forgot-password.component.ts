
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface MunicipalityOption {
  municipalityId: number;
  nameBn?: string;
  nameEn?: string;
}

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="login-page">
      <div class="login-bg"></div>

      <div class="login-card">
        <h2 class="page-title">পাসওয়ার্ড ভুলে গেছেন?</h2>

        <p class="subtitle">
          @if (step() === 1) {
            মোবাইল নম্বর দিন, OTP পাঠানো হবে
          }
          @if (step() === 2) {
            OTP ও নতুন পাসওয়ার্ড দিন
          }
        </p>

        @if (errorMsg()) {
          <div class="alert alert-danger">{{ errorMsg() }}</div>
        }

        @if (infoMsg()) {
          <div class="alert alert-success">{{ infoMsg() }}</div>
        }

        @if (step() === 1) {
          <div class="form-group">
            <label>মোবাইল নম্বর</label>
            <input
              class="form-control"
              type="tel"
              placeholder="01XXXXXXXXX"
              [(ngModel)]="mobile"
              maxlength="11"
              [disabled]="loading()"
            />
          </div>

          @if (municipalities.length > 0) {
            <div class="form-group">
              <label>পৌরসভা নির্বাচন করুন</label>

              <select
                class="form-control"
                [(ngModel)]="selectedMunicipalityId"
                [disabled]="loading()"
              >
                <option value="">-- পৌরসভা নির্বাচন করুন --</option>

                @for (m of municipalities; track m.municipalityId) {
                  <option [value]="m.municipalityId">
                    {{ m.nameBn || m.nameEn || ('Municipality ' + m.municipalityId) }}
                  </option>
                }
              </select>
            </div>
          }

          <button
            class="btn btn-primary btn-block"
            [disabled]="loading() || mobile.length !== 11 ||
              (municipalities.length > 0 && !selectedMunicipalityId)"
            (click)="sendOtp()"
          >
            {{ loading() ? 'অপেক্ষা করুন...' :
              (municipalities.length > 0 ? 'নির্বাচিত পৌরসভায় OTP পাঠান' : 'OTP পাঠান') }}
          </button>
        }

        @if (step() === 2) {
          <div class="form-group">
            <label>OTP কোড</label>
            <input
              class="form-control"
              [(ngModel)]="otp"
              maxlength="6"
              autocomplete="one-time-code"
            />
          </div>

          <div class="form-group">
            <label>নতুন পাসওয়ার্ড</label>
            <input
              type="password"
              class="form-control"
              [(ngModel)]="newPassword"
              autocomplete="new-password"
            />
          </div>

          <div class="form-group">
            <label>পাসওয়ার্ড আবার লিখুন</label>
            <input
              type="password"
              class="form-control"
              [(ngModel)]="confirmPassword"
              autocomplete="new-password"
            />
          </div>

          <button
            class="btn btn-primary btn-block"
            [disabled]="loading() || !otp || !newPassword || !confirmPassword"
            (click)="reset()"
          >
            {{ loading() ? 'রিসেট হচ্ছে...' : 'পাসওয়ার্ড রিসেট করুন' }}
          </button>
        }

        <div class="back-link">
          <a routerLink="/login">লগইনে ফিরে যান</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 20px;
    }

    .login-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, #0a5c36, #0d7a48, #0a5c36);
    }

    .login-card {
      position: relative;
      z-index: 1;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.25);
      padding: 32px 36px;
      width: 100%;
      max-width: 400px;
    }

    .page-title {
      text-align: center;
      color: #0a5c36;
      margin-bottom: 8px;
    }

    .subtitle {
      text-align: center;
      margin-bottom: 20px;
      font-size: 0.9rem;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 6px;
    }

    .form-control {
      width: 100%;
      box-sizing: border-box;
      padding: 10px;
    }

    .back-link {
      text-align: center;
      margin-top: 16px;
    }
  `],
})
export class ForgotPasswordComponent {
  step = signal(1);
  loading = signal(false);
  errorMsg = signal('');
  infoMsg = signal('');

  mobile = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';

  municipalities: MunicipalityOption[] = [];
  selectedMunicipalityId = '';
  municipalityId: number | null = null;

  constructor(private auth: AuthService) {}

  sendOtp() {
    this.errorMsg.set('');
    this.infoMsg.set('');

    if (!/^01\d{9}$/.test(this.mobile)) {
      this.errorMsg.set('সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।');
      return;
    }

    if (this.municipalities.length > 0 && !this.selectedMunicipalityId) {
      this.errorMsg.set('একটি পৌরসভা নির্বাচন করুন।');
      return;
    }

    this.loading.set(true);

    const selectedId = this.selectedMunicipalityId
      ? Number(this.selectedMunicipalityId)
      : undefined;

    this.auth.forgotSendOtp(this.mobile, selectedId?.toString()).subscribe({
      next: (res: any) => {
        this.loading.set(false);

        const data = res?.data ?? res;

        if (data?.requiresMunicipalitySelection) {
          this.municipalities = data.municipalities ?? [];
          this.selectedMunicipalityId = '';
          this.infoMsg.set('আপনার পৌরসভা নির্বাচন করে আবার OTP পাঠান।');
          return;
        }

        const returnedId = data?.municipalityId ?? selectedId;

        if (!returnedId) {
          this.errorMsg.set(
            'পৌরসভার তথ্য পাওয়া যায়নি। আবার চেষ্টা করুন।'
          );
          return;
        }

        this.municipalityId = Number(returnedId);
        this.selectedMunicipalityId = String(returnedId);
        this.infoMsg.set('OTP পাঠানোর অনুরোধ সম্পন্ন হয়েছে।');
        this.step.set(2);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(
          err?.error?.message || 'OTP পাঠানো যায়নি। আবার চেষ্টা করুন।'
        );
      },
    });
  }

  reset() {
    this.errorMsg.set('');
    this.infoMsg.set('');

    if (!this.municipalityId) {
      this.errorMsg.set('পৌরসভার তথ্য পাওয়া যায়নি। আবার OTP নিন।');
      this.step.set(1);
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg.set('দুটি পাসওয়ার্ড এক নয়।');
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMsg.set('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (!this.otp.trim()) {
      this.errorMsg.set('OTP কোড লিখুন।');
      return;
    }

    this.loading.set(true);

    this.auth.forgotReset({
      municipalityId: String(this.municipalityId),
      mobile: this.mobile,
      otp: this.otp.trim(),
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.infoMsg.set(
          'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। লগইন পেজে যাচ্ছেন...'
        );

        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(
          err?.error?.message || 'পাসওয়ার্ড রিসেট করা যায়নি।'
        );
      },
    });
  }
}
