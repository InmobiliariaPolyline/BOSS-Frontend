import { Injectable } from '@angular/core';
import { GenericSignalService } from './generic-signal.service';
import { CostoDiario } from '../model/CostoDiario';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class CostoDiarioService extends GenericSignalService<CostoDiario> {
  protected override url: string = `${environment.HOST}costos`;
}
