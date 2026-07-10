import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { NuevoEmpleadoDialogComponent } from './dialogs/nuevo-empleado-dialog/nuevo-empleado-dialog.component';
import { ConfirmDialogComponent } from './dialogs/confirmar-dialog/confirmar-dialog.component';
import { Empleado } from '../../model/Empleado';
import { EmpleadoService } from '../../services/empleado.service';
import { ObraService } from '../../services/obra.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-empleado',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './empleado.component.html',
  styleUrls: ['./empleado.component.css'],
})
export class EmpleadoComponent implements OnInit {

  protected empleados = signal<Empleado[]>([]);
  filtro = signal('');

  empleadosFiltrados = computed(() => {
    const term = this.filtro().toLowerCase();
    if (!term) return this.empleados();
    return this.empleados().filter(e =>
      `${e.nombres} ${e.apellidos} ${e.dni}`
        .toLowerCase()
        .includes(term)
    );
  });

  private readonly empleadoService = inject(EmpleadoService);
  private readonly obraService = inject(ObraService);
  private readonly dialog = inject(NgbModal);

  // Effect que se ejecuta cuando cambia la obra seleccionada
  private readonly obraEffect = effect(() => {
    const obra = this.obraService.$selectedObra();
    if (obra?.idObra) {
      this.cargarEmpleadosPorObra(obra.idObra);
    } else {
      this.empleados.set([]);
    }
  });

  ngOnInit(): void {
    const obra = this.obraService.$selectedObra();
    if (obra?.idObra) {
      this.cargarEmpleadosPorObra(obra.idObra);
    }
  }

  private async cargarEmpleadosPorObra(idObra: number): Promise<void> {
    try {
      const obra: any = await firstValueFrom(this.obraService.findById(idObra));
      this.empleados.set(obra.empleados ?? []);
    } catch (err) {
      console.error('Error cargando empleados:', err);
    }
  }

  abrirNuevo(): void {
    const ref = this.dialog.open(NuevoEmpleadoDialogComponent, {
      size: 'lg',
      backdrop: 'static'
    });
    ref.componentInstance.data = null;
    ref.result.then(guardado => {
      if (guardado) this.cargarEmpleadosPorObra(this.obraService.$selectedObra()?.idObra!);
    }).catch(() => {});
  }

  Editar(empleado: Empleado): void {
    const ref = this.dialog.open(NuevoEmpleadoDialogComponent, {
      size: 'lg',
      backdrop: 'static'
    });
    ref.componentInstance.data = empleado;
    ref.result.then(guardado => {
      if (guardado) this.cargarEmpleadosPorObra(this.obraService.$selectedObra()?.idObra!);
    }).catch(() => {});
  }

  eliminar(empleado: Empleado): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      size: 'sm'
    });
    ref.componentInstance.data = { nombre: `${empleado.nombres} ${empleado.apellidos}` };

    ref.result.then(async confirmado => {
      if (confirmado) {
        console.log('Empleado:', empleado);
        console.log('ID:', empleado.idEmpleado);
        try {
          await firstValueFrom(this.empleadoService.delete(empleado.idEmpleado));
          await this.cargarEmpleadosPorObra(this.obraService.$selectedObra()?.idObra!);
        } catch (err) {
          console.error('Error al eliminar:', err);
        }
      }
    }).catch(() => {});
  }

  contactar(empleado: Empleado): void {
    if (empleado.correoElectronico) {
      window.location.href = `mailto:${empleado.correoElectronico}?subject=Contacto%20Proyecto%20BOSS&body=Hola%20${empleado.nombres},%20me%20comunico%20para...`;
    } else {
      console.error('El empleado no tiene un correo registrado');
    }
  }

  whatsapp(empleado: Empleado): void {
    const numero = empleado.telefono;
    window.open(`https://wa.me/+51${numero}`, '_blank');
  }
}