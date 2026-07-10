import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';

interface ILoginRequest {
  username: string;   // ✅ el request lleva username y password
  password: string;
}

interface ILoginResponse {
  access_token: string;  // ✅ lo que devuelve el backend
}

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private url: string = `${environment.HOST}login`;
  private http = inject(HttpClient);

  login(username: string, password: string) {
    const body: ILoginRequest = { username, password };
    return this.http.post<ILoginResponse>(this.url, body);
  }

  logout() {
      return this.http.get(`${environment.HOST}auth/logout`);
    }
  getRol(): string | null {
    const token = sessionStorage.getItem(environment.TOKEN_NAME);
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role ?? null; // tu JWT tiene el campo "role"
  }

  isJefe(): boolean {
    const rol = this.getRol();
    return rol ? rol.split(',').includes('JEFE_OBRA') : false;
  }

  isDeveloper(): boolean {
    const rol = this.getRol();
    return rol ? rol.split(',').includes('DEVELOPER') : false;
  }
}