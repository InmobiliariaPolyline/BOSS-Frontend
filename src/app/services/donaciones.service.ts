import { Injectable } from '@angular/core';
import { GenericSignalService } from './generic-signal.service';
import { Donaciones } from '../model/donaciones';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DonacionesService extends GenericSignalService<Donaciones> {
  protected override url:string = `${environment.HOST}donaciones`;
}
