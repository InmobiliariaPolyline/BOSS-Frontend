import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Usuario } from '../model/usuario';
import { GenericService } from './generic.service';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService extends GenericService<Usuario> {
  protected override url = `${environment.HOST}usuario`;
}
