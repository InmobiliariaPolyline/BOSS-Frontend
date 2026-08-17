import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { GenericSignalService } from './generic-signal.service';
import { ObraArchivo } from '../model/obraArchivo';

@Injectable({
  providedIn: 'root',
})
export class ObraArchivoService extends GenericSignalService<ObraArchivo> {
  protected override url = `${environment.HOST}obra-archivos`;

  findByObra(idObra: number) {
    return this.http.get<ObraArchivo[]>(`${this.url}/obra/${idObra}`);
  }

  uploadFile(formData: FormData) {
    return this.http.post<ObraArchivo>(`${this.url}/upload`, formData);
  }
}
