import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // 👈 আপনার AuthService-এর আসল path দিন

export const platformAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.hasRole('PLATFORM_ADMIN') ? true : router.createUrlTree(['/dashboard']);
};