import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from '../services/login.service';

export const jefeGuard: CanActivateFn = () => {
  const loginService = inject(LoginService);
  const router = inject(Router);

  if (loginService.isJefe() || loginService.isDeveloper()) return true;

  router.navigate(['/pages/dashboard']);
  return false;
};