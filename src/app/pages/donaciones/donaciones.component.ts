import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DonacionesService } from '../../services/donaciones.service';
import { Donaciones } from '../../model/donaciones';
import { ObraService } from '../../services/obra.service';
import { MaterialService } from '../../services/material.service';
import { Material } from '../../model/material';
import { FiltroTextoDirective } from '../../shared/directives/filtro-texto.directive';
import { FiltroNumerosDirective } from '../../shared/directives/filtro-numeros.directive';
import { FiltroFechasDirective } from '../../shared/directives/filtro-fechas.directive';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-donaciones',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FiltroTextoDirective,
    FiltroNumerosDirective,
    FiltroFechasDirective,
  ],
  templateUrl: './donaciones.component.html',
  styleUrl: './donaciones.component.css'
})
export class DonacionesComponent {
  private readonly donacionservice = inject(DonacionesService);
  private readonly obraService = inject(ObraService);
  private readonly materialService = inject(MaterialService);

  activeTab = signal<'efectivo' | 'especie'>('efectivo');

  protected $donaciones = computed(() => {
    const idObra = this.obraseleccionada();
    return this.donacionservice.$listChange().filter((d) => ((d as any).obra?.idObra || d.idObra) == idObra);
  });
  protected displayedColumns: string[] = ['idDonacion', 'nombreDonante', 'tipoDonacion', 'descripcion', 'montoTotal', 'fechaRegistro'];

  protected readonly totalDonaciones = computed(() =>
    this.$donaciones().reduce((acumulado, donacion) => acumulado + (Number(donacion.montoTotal) || 0), 0),
  );

  protected readonly totalEfectivo = computed(() =>
    this.$donaciones()
      .filter((donacion) => donacion.tipoDonacion?.toLowerCase() === 'efectivo')
      .reduce((acumulado, donacion) => acumulado + (Number(donacion.montoTotal) || 0), 0),
  );

  protected readonly totalEspecie = computed(() =>
    this.$donaciones()
      .filter((donacion) => donacion.tipoDonacion?.toLowerCase() === 'especie').length
  );

  protected readonly obraseleccionada = computed(() => {
    const obra = this.obraService.$selectedObra();
    return obra?.idObra ?? null;
  });

  protected $formEfectivo = signal(new FormGroup({
    idDonacion: new FormControl<number | null>(null),
    nombreDonante: new FormControl<string>('', [Validators.required]),
    descripcion: new FormControl<string>('', [Validators.required]),
    montoTotal: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
  }));

  protected $formEspecie = signal(new FormGroup({
    idDonacion: new FormControl<number | null>(null),
    nombreDonante: new FormControl<string>('', [Validators.required]),
    materialDonado: new FormControl<string>('', [Validators.required]),
    stock: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    unidadMedida: new FormControl<string>('', [Validators.required]),
  }));

  constructor() {
    this.cargarDonaciones();
  }

  async RegistrarEfectivo(): Promise<void> {
    const idObraActual = this.obraseleccionada();
    if (this.$formEfectivo().valid && idObraActual) {
      const formValue = this.$formEfectivo().value;
      const donacionData: Donaciones = {
        idDonacion: formValue.idDonacion!,
        idObra: idObraActual,
        nombreDonante: formValue.nombreDonante!,
        tipoDonacion: 'Efectivo',
        descripcion: formValue.descripcion!,
        cantidadDonada: 0,
        precioUnitario: 0,
        montoTotal: formValue.montoTotal!,
        fechaRegistro: new Date(),
      };
      
      try {
        await firstValueFrom(this.donacionservice.save(donacionData));
        this.$formEfectivo().reset();
        await this.cargarDonaciones();
      } catch (err) {
        console.error(err);
      }
    }
  }

  async RegistrarEspecie(): Promise<void> {
    const idObraActual = this.obraseleccionada();
    if (this.$formEspecie().valid && idObraActual) {
      const formValue = this.$formEspecie().value;
      
      // 1. Crear el material
      const nuevoMaterial: Material = {
        idMaterial: null!,
        idObra: idObraActual,
        nombreMaterial: `${formValue.materialDonado} (donación)`,
        categoria: 'Materiales',
        unidadMedida: formValue.unidadMedida!,
        precioUnitario: 0,
        stockActual: formValue.stock!,
        fechaCompra: new Date().toISOString().split('T')[0]
      };

      try {
        await firstValueFrom(this.materialService.save(nuevoMaterial));
        
        // 2. Crear la donación
        const donacionData: Donaciones = {
          idDonacion: formValue.idDonacion!,
          idObra: idObraActual,
          nombreDonante: formValue.nombreDonante!,
          tipoDonacion: 'Especie',
          descripcion: formValue.materialDonado!,
          cantidadDonada: 0,
          precioUnitario: 0,
          montoTotal: 0,
          fechaRegistro: new Date(),
        };

        await firstValueFrom(this.donacionservice.save(donacionData));
        this.$formEspecie().reset();
        await this.cargarDonaciones();
      } catch (err) {
        console.error(err);
      }
    }
  }

  private async cargarDonaciones(): Promise<void> {
    try {
      const data = await firstValueFrom(this.donacionservice.findAll());
      this.donacionservice.setListChange(data);
    } catch (err) {
      console.error(err);
    }
  }
}
