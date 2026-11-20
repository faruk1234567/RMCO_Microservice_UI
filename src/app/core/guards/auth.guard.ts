import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// ✅ Dynamic Guard — কোনো Route এর নাম, কোনো Permission Map, কোনো Static নাই
// Guard এর কাজ শুধু ১টা: Login আছে কিনা দেখা
// Permission চেক করবে Menu + Backend, Guard না

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.currentUser()) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Login থাকলে Login পেজে ঢুকতে দিবো না, Dashboard এ পাঠাবো
  if (auth.currentUser()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

export const platformAdminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.currentUser()) {
    router.navigate(['/login']);
    return false;
  }

  // ✅ Dynamic: Role এর নাম Code এ Hardcode না করে, AuthService থেকে চেক করো
  // তোমার AuthService এ hasRole() আছে, ওইটাই ব্যবহার করো
  if (!auth.hasRole('PLATFORM_ADMIN')) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};