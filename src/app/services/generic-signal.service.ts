import { Injectable, signal } from '@angular/core';
import { GenericService } from './generic.service';

@Injectable({
  providedIn: 'root',
})
export abstract class GenericSignalService<T> extends GenericService<T> {
  private readonly _list = signal<T[]>([]);
  private readonly _message = signal<string>('');

  readonly $listChange = this._list.asReadonly();
  readonly $messageChange = this._message.asReadonly();
    setListChange(data: T[]){
    this._list.set(data);
  }

  setMessageChange(msg: string){
    this._message.set(msg);
  }
}
