import { Injectable } from '@angular/core';
import { GenericSignalService } from './generic-signal.service';
import { environment } from '../../environments/environment.development';
import { CajaChica } from '../model/cajachica';
import { gastocaja } from '../model/gastocaja';

@Injectable({
  providedIn: 'root',
})
export class GastoCajaService extends GenericSignalService<gastocaja> { 
  protected url: string = `${environment.HOST}gasto-caja`;
}
