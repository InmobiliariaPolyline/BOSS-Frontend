import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { GenericSignalService } from './generic-signal.service';
import { Material } from '../model/material';


@Injectable({ providedIn: 'root' })
export class MaterialService extends GenericSignalService<Material> {
  protected override url: string = `${environment.HOST}material`;
  
  registrarMovimientoEntrada(movimiento: any) {
    return this.http.post(`${environment.HOST}movimiento-material`, movimiento);
  }

  listPageableByObra(idObra: number, page: number, size: number) {
    return this.http.get<any>(`${this.url}/obra/${idObra}/pageable?page=${page}&size=${size}`);
  }
}