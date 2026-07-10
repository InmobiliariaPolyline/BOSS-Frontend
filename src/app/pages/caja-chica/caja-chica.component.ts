import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CajaChica } from '../../model/cajachica';
import { gastocaja } from '../../model/gastocaja';
import { GastoCajaService } from '../../services/gasto-caja.service';
import { CajaChicaService } from '../../services/caja-chica.service';
import { ObraService } from '../../services/obra.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-caja-chica',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './caja-chica.component.html',
  styleUrl: './caja-chica.component.css',
})
export class CajaChicaComponent {
  private readonly cajaChicaService = inject(CajaChicaService);
  private readonly gastoCajaService = inject(GastoCajaService);
  private readonly obraService = inject(ObraService);

  protected readonly cajaChicaActual = signal<CajaChica | null>(null);

  protected $gastos = computed(() => {
    const caja = this.cajaChicaActual();
    return caja ? this.gastoCajaService.$listChange().filter((g) => ((g as any).cajaChica?.idCajaChica || g.idCajaChica) == caja.idCajaChica) : [];
  });
  protected $columnas: string[] = ['categoriaGasto', 'monto', 'fechaGasto', 'concepto'];

  protected readonly totalIngresos = computed(() =>
    this.$gastos().filter((gasto) => gasto.categoriaGasto?.toLowerCase() === 'ingreso').length,
  );

  protected readonly totalEgresos = computed(() =>
    this.$gastos().filter((gasto) => gasto.categoriaGasto?.toLowerCase() === 'egreso').length,
  );

  protected readonly totalIngresosMonto = computed(() =>
    this.$gastos()
      .filter((gasto) => gasto.categoriaGasto?.toLowerCase() === 'ingreso')
      .reduce((acumulado, gasto) => acumulado + (Number(gasto.monto) || 0), 0),
  );

  protected readonly totalEgresosMonto = computed(() =>
    this.$gastos()
      .filter((gasto) => gasto.categoriaGasto?.toLowerCase() === 'egreso')
      .reduce((acumulado, gasto) => acumulado + (Number(gasto.monto) || 0), 0),
  );

  protected readonly saldoCalculado = computed(() => this.totalIngresosMonto() - this.totalEgresosMonto());

  protected readonly obraSeleccionada = computed(() => {
    const obra = this.obraService.$selectedObra();
    return obra?.idObra ?? null;
  });

  protected $form = signal(
    new FormGroup({
      idgastocaja: new FormControl<number | null>(null),
      categoriaGasto: new FormControl<string | null>(null, [Validators.required]),
      monto: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
      concepto: new FormControl<string | null>(null, [Validators.required]),
    }),
  );

  constructor() {
    this.cargarGastos();

    effect(() => {
      const obraId = this.obraSeleccionada();

      if (obraId === null) {
        this.cajaChicaActual.set(null);
        return;
      }

      this.verificarOCrearCajaChica(obraId);
    });
  }

  async CrearGasto(): Promise<void> {
    if (this.$form().valid) {
      const cajaActual = this.cajaChicaActual();

      if (!cajaActual || cajaActual.idCajaChica == null) {
        this.gastoCajaService.setMessageChange('Error: No se ha cargado una Caja Chica para esta obra.');
        return;
      }

      const datosGasto = this.$form().value;
      const gastoCajaData: gastocaja = {
        idgastocaja: datosGasto.idgastocaja ?? null,
        idCajaChica: cajaActual.idCajaChica,
        categoriaGasto: datosGasto.categoriaGasto!,
        monto: datosGasto.monto!,
        fechaGasto: new Date(),
        concepto: datosGasto.concepto!,
      };

      try {
        await firstValueFrom(this.gastoCajaService.save(gastoCajaData));
        this.gastoCajaService.setMessageChange('Gasto registrado correctamente');
        await this.cargarGastos();
        this.$form().reset();
      } catch (err) {
        this.gastoCajaService.setMessageChange('Error al registrar el gasto');
        console.error(err);
      }
    }
  }

  private async cargarGastos(): Promise<void> {
    try {
      const data = await firstValueFrom(this.gastoCajaService.findAll());
      this.gastoCajaService.setListChange(data);
    } catch (err) {
      console.error(err);
    }
  }

  private async verificarOCrearCajaChica(idObra: number): Promise<void> {
    try {
      const cajasChicas = await firstValueFrom(this.cajaChicaService.findAll());
      const cajaExistente = cajasChicas.find((caja) => ((caja as any).obra?.idObra || caja.idObra) == idObra) ?? null;

      if (cajaExistente) {
        this.cajaChicaActual.set(cajaExistente);
        return;
      }

      const nuevaCaja: CajaChica = {
        idCajaChica: null,
        idObra,
        saldoActual: 0,
      };

      try {
        const cajaCreada = await firstValueFrom(this.cajaChicaService.save(nuevaCaja));
        this.cajaChicaActual.set((cajaCreada as CajaChica) ?? nuevaCaja);
      } catch (err) {
        console.error(err);
      }
    } catch (err) {
      console.error(err);
    }
  }
}
