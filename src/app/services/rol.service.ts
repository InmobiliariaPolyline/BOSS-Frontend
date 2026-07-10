import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Rol } from '../model/rol';
import { GenericService } from './generic.service';

@Injectable({
  providedIn: 'root',
})
export class RolService extends GenericService<Rol> {
  protected override url = `${environment.HOST}rol`;
}
