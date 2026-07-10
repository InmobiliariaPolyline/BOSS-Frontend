import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { Empleado } from '../../../../model/Empleado';
import { EmpleadoService } from '../../../../services/empleado.service';
import { ObraService } from '../../../../services/obra.service';
import { FiltroTextoDirective } from '../../../../shared/directives/filtro-texto.directive';
import { FiltroNumerosDirective } from '../../../../shared/directives/filtro-numeros.directive';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-nuevo-empleado-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FiltroTextoDirective,
    FiltroNumerosDirective,
  ],
  templateUrl: './nuevo-empleado-dialog.component.html',
  styleUrls: ['./nuevo-empleado-dialog.component.css'],
})
export class NuevoEmpleadoDialogComponent implements OnInit {

  private readonly activeModal = inject(NgbActiveModal);
  private readonly empleadoService = inject(EmpleadoService);
  private readonly obraService = inject(ObraService);
  
  @Input() data: Empleado | null = null;
  
  //Verificamos si es el modo edicion o modo creacion
  estadoEdicion = false;

  empleado!: Empleado;
  cargos = ['Operario', 'Oficial', 'Capataz', 'Maestro de obra'];
  // Teléfono separado
  codigoPais = '+51';
  telefonoNumero = '';

  ngOnInit() {
    this.estadoEdicion = !!this.data;
    this.empleado = this.data ? { ...this.data } : {
      idEmpleado: 0,
      dni: null!,
      nombres: '',
      apellidos: '',
      cargo: '',
      telefono: null!,
      correoElectronico: '',
      direccion: '',
      observaciones: '',
      estado: true,
    };
    this.telefonoNumero = this.data?.telefono?.toString() ?? '';
  }

  paises = [
    { codigo: '+51', nombre: 'Perú' },
    { codigo: '+57', nombre: 'Colombia' },
    { codigo: '+56', nombre: 'Chile' },
    { codigo: '+54', nombre: 'Argentina' },
    { codigo: '+59', nombre: 'Bolivia' },
    { codigo: '+593', nombre: 'Ecuador' },
    { codigo: '+595', nombre: 'Paraguay' },
    { codigo: '+598', nombre: 'Uruguay' },
    { codigo: '+58', nombre: 'Venezuela' },
    { codigo: '+55', nombre: 'Brasil' },
    { codigo: '+1', nombre: 'EE.UU.' },
    { codigo: '+34', nombre: 'España' },
  ];

  // Solo permite dígitos y limita longitud
  soloNumeros(event: Event, maxLen: number): void {
    const input = event.target as HTMLInputElement;
    const valor = input.value.replace(/\D/g, '').slice(0, maxLen);
    if (input.value !== valor) {
      input.value = valor;
    }
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }

  async registrar(): Promise<void> {
    if (this.telefonoNumero) {
      this.empleado.telefono = parseInt(this.telefonoNumero);
    }

    if (this.estadoEdicion) {
      try {
        await firstValueFrom(this.empleadoService.update(this.empleado.idEmpleado, this.empleado));
        this.activeModal.close(true);
      } catch (err) {
        console.error('Error al actualizar:', err);
      }
    } else {
      const { idEmpleado, ...payload } = this.empleado;
      const payloadFinal = { ...payload, dni: Number(payload.dni) };

      try {
        const response: any = await firstValueFrom(this.empleadoService.save(payloadFinal as any));
        const nuevoId = response.idEmpleado;
        const obraActual = this.obraService.$selectedObra();
        if (obraActual && nuevoId) {
          try {
            await firstValueFrom(this.obraService.agregarEmpleado(obraActual.idObra, nuevoId));
            this.activeModal.close(true);
          } catch (err) {
            console.error('Error al asignar a obra:', err);
          }
        } else {
          this.activeModal.close(true);
        }
      } catch (err) {
        console.error('Error al guardar:', err);
      }
    }
  }
}
