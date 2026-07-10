import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private router = inject(Router);
  private loginService = inject(LoginService);

  username: string = '';
  password: string = '';
  hidePassword: boolean = true;

  isLoggingIn = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    // Asegurar que el inicio de sesión siempre conserve sus colores (tema claro base)
    // eliminando atributos de tema oscuro si quedaron activos de una sesión previa
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-bs-theme');
  }

  async onLogin(): Promise<void> {
    if (!this.username || !this.password) {
      this.errorMessage.set('Completa todos los campos.');
      return;
    }

    this.isLoggingIn.set(true);
    this.errorMessage.set('');

    try {
      const data = await firstValueFrom(this.loginService.login(this.username, this.password));
      sessionStorage.setItem(environment.TOKEN_NAME, data.access_token);
      this.router.navigate(['/pages']);
    } catch {
      this.errorMessage.set('Usuario o contraseña incorrectos.');
      this.isLoggingIn.set(false);
    }
  }
}