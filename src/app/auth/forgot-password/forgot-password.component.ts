
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface MunicipalityOption {
  municipalityId: number | null;
  nameBn?: string;
  nameEn?: string;
  accountType?: string;
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
              <label>অ্যাকাউন্ট নির্বাচন করুন</label>

              <select
                class="form-control"
                [(ngModel)]="selectedMunicipalityId"
                [disabled]="loading()"
              >
                <option value="">-- অ্যাকাউন্ট নির্বাচন করুন --</option>

                @for (m of municipalities; track $index) {
                  <option [value]="m.municipalityId === null ? 'GLOBAL' : m.municipalityId">
                    {{ m.nameBn || m.nameEn ||
                      (m.municipalityId === null
                        ? 'গ্লোবাল নাগরিক অ্যাকাউন্ট'
                        : 'Municipality ' + m.municipalityId) }}
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
              (municipalities.length > 0
                ? 'নির্বাচিত অ্যাকাউন্টে OTP পাঠান'
                : 'OTP পাঠান') }}
          </button>
        }

        @if (step() === 2) {
          <div class="form-group">
            <label>OTP কোড</label>
            <input
              class="form-control"
              type="text"
              [(ngModel)]="otp"
              maxlength="6"
              inputmode="numeric"
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
            [disabled]="loading() || !otp.trim() ||
              !newPassword || !confirmPassword"
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
      this.errorMsg.set('একটি অ্যাকাউন্ট নির্বাচন করুন।');
      return;
    }

    this.loading.set(true);

    // GLOBAL মানে নির্বাচিত অ্যাকাউন্টের municipalityId null।
    const isGlobal = this.selectedMunicipalityId === 'GLOBAL';

    const selectedId: number | null =
      isGlobal
        ? null
        : this.selectedMunicipalityId
          ? Number(this.selectedMunicipalityId)
          : null;

    this.auth.forgotSendOtp(
      this.mobile,
      selectedId === null ? undefined : String(selectedId)
    ).subscribe({
      next: (res: any) => {
        this.loading.set(false);

        const data = res?.data ?? res;

        if (data?.requiresMunicipalitySelection) {
          this.municipalities = (data.municipalities ?? []).map(
            (m: any) => ({
              ...m,
              municipalityId:
                m.municipalityId === null ||
                m.municipalityId === undefined
                  ? null
                  : Number(m.municipalityId),
            })
          );

          this.selectedMunicipalityId = '';
          this.infoMsg.set(
            'আপনার সঠিক অ্যাকাউন্ট নির্বাচন করে আবার OTP পাঠান।'
          );
          return;
        }

        // Backend response-এ municipalityId না থাকলে
        // নির্বাচিত account-এর context ব্যবহার করুন।
        const responseId = data?.municipalityId;

        if (responseId !== null && responseId !== undefined) {
          this.municipalityId = Number(responseId);
        } else if (isGlobal) {
          this.municipalityId = null;
        } else if (this.selectedMunicipalityId) {
          this.municipalityId = selectedId;
        } else {
          // Global account-এর জন্য municipalityId null বৈধ।
          // Backend-এ OTP send সফল হলে পরের ধাপে যেতে হবে।
          this.municipalityId = null;
        }

        this.infoMsg.set(
          'OTP পাঠানোর অনুরোধ সফল হয়েছে। মোবাইলে পাওয়া OTP লিখুন।'
        );
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

    // null municipalityId Global Citizen Account-এর জন্য বৈধ।
    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg.set('দুটি পাসওয়ার্ড এক নয়।');
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMsg.set('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (!/^\d{6}$/.test(this.otp.trim())) {
      this.errorMsg.set('সঠিক ৬ সংখ্যার OTP কোড লিখুন।');
      return;
    }

    this.loading.set(true);

    this.auth.forgotReset({
      municipalityId:
        this.municipalityId === null
          ? undefined
          : String(this.municipalityId),
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
