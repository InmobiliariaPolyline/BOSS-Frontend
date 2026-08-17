import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { MaterialService } from '../../../../services/material.service';
import { ObraService } from '../../../../services/obra.service';
import { Material } from '../../../../model/material';
import { FiltroTextoDirective } from '../../../../shared/directives/filtro-texto.directive';
import { FiltroFechasDirective } from '../../../../shared/directives/filtro-fechas.directive';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-nuevo-material',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FiltroTextoDirective,
    FiltroFechasDirective,
  ],
  templateUrl: './nuevo-material.component.html',
  styleUrls: ['./nuevo-material.component.css'],
})
export class NuevoMaterialDialogComponent implements OnInit {

  private readonly activeModal       = inject(NgbActiveModal);
  private readonly materialService = inject(MaterialService);
  private readonly obraService     = inject(ObraService);
  
  @Input() data: Material | null = null;

  // true si viene un material para editar
  estadoEdicion = false;

  categorias = ['Materiales', 'Equipo', 'Otros'];

  material!: Material;

  ngOnInit() {
    this.estadoEdicion = !!(this.data?.idMaterial);
    this.material = this.data
      ? { ...this.data }
      : {
          idMaterial:     0,
          idObra:         0,
          nombreMaterial: '',
          categoria:      'Materiales',
          unidadMedida:   '',
          precioUnitario: 0,
          stockActual:    0,
          fechaCompra:    new Date().toISOString().split('T')[0],
        };
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }

  async guardar(): Promise<void> {
    if (!this.material.nombreMaterial?.trim() || !this.material.categoria) return;

    const obraActual = this.obraService.$selectedObra();

    const payloadFinal: any = {
      ...this.material,
      idMaterial: this.estadoEdicion ? this.material.idMaterial : null,
      idObra: obraActual?.idObra ?? this.material.idObra
    };

    console.log('Payload enviado al backend:', payloadFinal);

    // ── ACTUALIZAR ──
    if (this.estadoEdicion) {
      try {
        await firstValueFrom(this.materialService.update(this.material.idMaterial, payloadFinal));
        this.activeModal.close(true);
      } catch (err) {
        console.error('Error al actualizar:', err);
      }
    }
    // ── CREAR ──
    else {
      try {
        await firstValueFrom(this.materialService.save(payloadFinal));
        try {
          const data = await firstValueFrom(this.materialService.findAll());
          this.materialService.setListChange(data);
          this.activeModal.close(true);
        } catch (err) {
          console.error('Error al recargar materiales:', err);
        }
      } catch (err) {
        console.error('Error al guardar material:', err);
      }
    }
  }
}