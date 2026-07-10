import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Usuario } from '../model/usuario';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})

export class AuthService {
}