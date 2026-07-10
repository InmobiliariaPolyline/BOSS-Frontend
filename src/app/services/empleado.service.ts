import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Empleado } from '../model/Empleado';
import { GenericService } from './generic.service';

@Injectable({
  providedIn: 'root',
})
export class EmpleadoService extends GenericService<Empleado> {
  //private url = 'http://localhost:9090/empleado';
  protected override url = `${environment.HOST}empleados`;
}