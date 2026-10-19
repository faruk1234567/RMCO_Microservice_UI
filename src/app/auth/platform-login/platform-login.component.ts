import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-platform-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="login-page">
      <div class="login-bg platform"></div>
      <div class="login-card">
        <div class="logo-area">
          <div class="logo-circle">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#1a3a5c"/>
              <path d="M24 12c-4.4 0-8 3.6-8 8 0 2.5 1.2 4.7 3 6.1V28h10v-1.9c1.8-1.4 3-3.6 3-6.1 0-4.4-3.6-8-8-8zm-3 18h6v2h-6v-2z" fill="#fff"/>
            </svg>
          </div>
          <div class="brand">
            <div class="brand-top">PLATFORM ADMIN</div>
            <h1>Digital Municipality Services</h1>
          </div>
        </div>

        @if (errorMsg()) { <div class="alert alert-danger">{{ errorMsg() }}</div> }

        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <input type="text" class="form-control" placeholder="Platform ID / Email"
              [(ngModel)]="loginId" name="loginId" autofocus />
          </div>
          <div class="form-group">
            <input type="password" class="form-control" placeholder="Password"
              [(ngModel)]="password" name="password" />
          </div>
          <button type="submit" class="btn btn-platform btn-block btn-lg" [disabled]="loading()">
            {{ loading() ? 'লগইন হচ্ছে...' : 'Platform Login' }}
          </button>
        </form>

        <div class="login-links">
          <a routerLink="/login">পৌরসভা লগইন</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page { min-height:100vh; display:flex; align-items:center; justify-content:center; position:relative; padding:20px; }
    .login-bg { position:absolute; inset:0; background:linear-gradient(135deg,#1a3a5c,#2c5f8a,#1a3a5c); }
    .login-card {
      position:relative; z-index:1; background:#fff; border-radius:12px;
      box-shadow:0 12px 40px rgba(0,0,0,0.3); padding:36px 40px; width:100%; max-width:420px;
    }
    .logo-area { text-align:center; margin-bottom:24px; }
    .logo-circle { display:inline-flex; margin-bottom:8px; }
    .brand-top { font-size:0.7rem; letter-spacing:2px; color:#1a3a5c; font-weight:700; }
    .brand h1 { font-size:1.15rem; color:#1a1a1a; margin:4px 0 0; }
    .btn-platform {
      background:#1a3a5c; color:#fff; border:none; padding:12px; border-radius:8px;
      font-size:1rem; font-weight:600; cursor:pointer; width:100%;
    }
    .btn-platform:hover { background:#2c5f8a; }
    .btn-platform:disabled { opacity:0.6; cursor:not-allowed; }
    .login-links { text-align:center; margin-top:16px; }
    .login-links a { color:#1a3a5c; font-size:0.88rem; }
    .form-group { margin-bottom:14px; }
    .form-control {
      width:100%; padding:12px 14px; border:1.5px solid #d0d8e0; border-radius:8px;
      font-size:0.95rem; box-sizing:border-box;
    }
    .form-control:focus { outline:none; border-color:#1a3a5c; }
    .alert { padding:10px 14px; border-radius:8px; margin-bottom:14px; font-size:0.88rem; }
    .alert-danger { background:#f8d7da; color:#721c24; }
  `],
})
export class PlatformLoginComponent {
  loginId = '';
  password = '';
  loading = signal(false);
  errorMsg = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    this.errorMsg.set('');
    if (!this.loginId.trim() || !this.password.trim()) {
      this.errorMsg.set('ID এবং পাসওয়ার্ড দিতে হবে।');
      return;
    }
    this.loading.set(true);
    this.auth.platformLogin({
      loginId: this.loginId.trim(),
      password: this.password,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(
          err?.error?.message || err?.error?.error || 'Platform লগইন ব্যর্থ।'
        );
      },
    });
  }
}
