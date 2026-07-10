import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Obra } from '../model/obra';
import { HttpClient } from '@angular/common/http';
import { GenericSignalService } from './generic-signal.service';
import { Cliente } from '../model/cliente';

@Injectable({
  providedIn: 'root',
})
export class ObraService extends GenericSignalService<Obra> {
  protected override url = `${environment.HOST}obra`;

  private readonly _selectedObra = signal<Obra | null>(null);
  readonly $selectedObra = this._selectedObra.asReadonly();

  setSelectedObra(obra: Obra | null): void {
    this._selectedObra.set(obra);
  }


  agregarEmpleado(idObra: number, idEmpleado: number) {
    return this.http.post(`${this.url}/${idObra}/empleados`, { idEmpleado });
  }
}
