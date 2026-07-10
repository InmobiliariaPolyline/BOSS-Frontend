import { Injectable } from '@angular/core';
import { GenericSignalService } from './generic-signal.service';
import { environment } from '../../environments/environment.development';
import { CajaChica } from '../model/cajachica';

@Injectable({
  providedIn: 'root',
})
export class CajaChicaService extends GenericSignalService<CajaChica> { 
  protected url: string = `${environment.HOST}caja-chica`;
}
