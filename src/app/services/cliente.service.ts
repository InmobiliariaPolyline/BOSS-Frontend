import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Cliente } from '../model/cliente';
import { GenericSignalService } from './generic-signal.service';

@Injectable({
  providedIn: 'root',
})
export class ClienteService extends GenericSignalService<Cliente> {
  protected override url:string = `${environment.HOST}cliente`;
}