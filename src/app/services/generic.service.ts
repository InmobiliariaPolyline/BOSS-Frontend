import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export abstract class GenericService<T> {
  protected http = inject(HttpClient);
  protected abstract url: string;

  findAll() {
    return this.http.get<T[]>(this.url);
  }

  findById(id: number) {
    return this.http.get<T>(`${this.url}/${id}`);
  }

  save(t: T) {
    return this.http.post(this.url, t);
  }

  update(id: number, t: T) {
    return this.http.put(`${this.url}/${id}`, t);
  }

  delete(id: number) {
    return this.http.delete(`${this.url}/${id}`);
  }
}
