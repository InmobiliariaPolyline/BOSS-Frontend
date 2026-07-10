import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { ParteDiario } from '../model/parteDiario';
import { GenericSignalService } from './generic-signal.service';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ParteDiarioService extends GenericSignalService<ParteDiario> {
  protected override url = `${environment.HOST}parte-diario`;

  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'partes_diarios_preset');

    const cloudName = 'ddqe5f2br';

    return this.http.post<any>(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, formData).pipe(map(res => res.secure_url));
  }
}
