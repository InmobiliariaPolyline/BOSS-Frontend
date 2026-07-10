import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CostoDiario } from '../../model/CostoDiario';
import { ParteDiarioService } from '../../services/parte-diario.service';
import { ObraService } from '../../services/obra.service';
import { ParteDiario } from '../../model/parteDiario';
import { EvidenciaFoto } from '../../model/EvidenciaFoto';
import { MaterialService } from '../../services/material.service';
import { Material } from '../../model/material';
import { EmpleadoService } from '../../services/empleado.service';
import { Empleado } from '../../model/Empleado';
import { forkJoin, firstValueFrom } from 'rxjs';
import { FiltroTextoDirective } from '../../shared/directives/filtro-texto.directive';
import { FiltroNumerosDirective } from '../../shared/directives/filtro-numeros.directive';
import { FiltroFechasDirective } from '../../shared/directives/filtro-fechas.directive';

@Component({
  selector: 'app-parte-diario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FiltroTextoDirective, FiltroNumerosDirective, FiltroFechasDirective],
  templateUrl: './parte-diario.component.html',
  styleUrl: './parte-diario.component.css',
})
export class ParteDiarioComponent {
  private fb = inject(FormBuilder);
  private readonly parteDiarioService = inject(ParteDiarioService);
  private readonly obraService = inject(ObraService);
  private readonly materialService = inject(MaterialService);
  private readonly empleadoService = inject(EmpleadoService);

  protected form = this.fb.group({
    idObra: [null as number | null],
    fechaInforme: [new Date().toISOString().split('T')[0], Validators.required],
    jornadaLaboral: [8, Validators.required],
    elaboradoPor: ['', Validators.required],
    observaciones: [''],
    nombreParte: ['', Validators.required],
    cantidadEjecutada: [0, Validators.required],
    unidadMedida: ['', Validators.required],
    rendimientoReal: [0, Validators.required],
    rendimientoEsperado: [0, Validators.required],
    costos: this.fb.array([])
  });

  protected $f = computed(() => this.form.controls);
  protected fotos = signal<EvidenciaFoto[]>([]);
  costoTab = signal<'MATERIAL' | 'MANO_DE_OBRA' | 'EQUIPO' | 'OTROS'>('MATERIAL');

  materiales = this.materialService.$listChange;
  empleados = signal<Empleado[]>([]);

  showMaterialDropdown = signal(false);
  showEmpleadoDropdown = signal(false);

  nuevoCostoForm = this.fb.group({
    idItem: [null as number | null],
    searchMaterial: [''],
    searchEmpleado: [''],
    descripcion: [''],
    cantidad: [1, [Validators.required, Validators.min(0.01)]],
    costoUnitario: [0, [Validators.required, Validators.min(0)]]
  });

  protected formValues = toSignal(this.form.valueChanges);
  protected nuevoCostoValues = toSignal(this.nuevoCostoForm.valueChanges);

  protected totales = computed(() => {
    const currentFormValues = this.formValues();
    const costos = currentFormValues?.costos || this.form.value.costos || [];
    const resumen = {
      MATERIAL: { total: 0, count: 0 },
      MANO_DE_OBRA: { total: 0, count: 0 },
      EQUIPO: { total: 0, count: 0 },
      OTROS: { total: 0, count: 0 },
      total: 0,
      count: 0
    };
    costos.forEach((c: any) => {
      const importe = (c.cantidad || 0) * (c.costoUnitario || 0);
      if (c.tipo in resumen) {
        (resumen as any)[c.tipo].total += importe;
        (resumen as any)[c.tipo].count += 1;
      }
      resumen.total += importe;
      resumen.count += 1;
    });
    return resumen;
  });

  hasCostos(tipo: string): boolean {
    const costos = this.form.value.costos || [];
    return costos.some((c: any) => c.tipo === tipo);
  }

  filteredMateriales = computed(() => {
    const search = (this.nuevoCostoValues()?.searchMaterial || '').toLowerCase();
    const tab = this.costoTab();
    let targetCategory = 'Materiales';
    if (tab === 'EQUIPO') {
      targetCategory = 'Equipo';
    } else if (tab === 'OTROS') {
      targetCategory = 'Otros';
    }
    return this.materiales().filter(m =>
      m.categoria === targetCategory &&
      m.nombreMaterial.toLowerCase().includes(search)
    );
  });

  filteredEmpleados = computed(() => {
    const search = (this.nuevoCostoValues()?.searchEmpleado || '').toLowerCase();
    return this.empleados().filter(e => `${e.nombres} ${e.apellidos}`.toLowerCase().includes(search));
  });

  selectMaterial(mat: Material) {
    this.nuevoCostoForm.patchValue({
      idItem: mat.idMaterial,
      searchMaterial: mat.nombreMaterial,
      descripcion: mat.nombreMaterial,
      costoUnitario: mat.precioUnitario
    });
    this.showMaterialDropdown.set(false);
  }

  selectEmpleado(emp: Empleado) {
    this.nuevoCostoForm.patchValue({
      idItem: emp.idEmpleado,
      searchEmpleado: `${emp.nombres} ${emp.apellidos}`,
      descripcion: `${emp.nombres} ${emp.apellidos}`
    });
    this.showEmpleadoDropdown.set(false);
  }

  protected readonly obraseleccionada = computed(() => this.obraService.$selectedObra()?.idObra ?? null);

  setCostoTab(tab: string) {
    this.costoTab.set(tab as any);
  }

  private async inicializarParteDiario(): Promise<void> {
    try {
      const mats = await firstValueFrom(this.materialService.findAll());
      this.materialService.setListChange(mats);
    } catch (err) {
      console.error('Error cargando materiales:', err);
    }
    try {
      const emps = await firstValueFrom(this.empleadoService.findAll());
      this.empleados.set(emps);
    } catch (err) {
      console.error('Error cargando empleados:', err);
    }
  }

  constructor() {
    effect(() => {
      const idObra = this.obraseleccionada();
      if (idObra) {
        untracked(() => {
          this.form.patchValue({ idObra });
        });
        this.inicializarParteDiario();
      }
    });

    effect(() => {
      this.costoTab();
      this.nuevoCostoForm.reset({ idItem: null, searchMaterial: '', searchEmpleado: '', descripcion: '', cantidad: 1, costoUnitario: 0 });
    }, { allowSignalWrites: true });

    effect(() => {
      const tab = this.costoTab();
      const values = this.nuevoCostoValues();
      if (values) {
        untracked(() => {
          if (tab === 'MANO_DE_OBRA') {
            if (!values.searchEmpleado) {
              this.nuevoCostoForm.patchValue({ idItem: null }, { emitEvent: false });
            }
          } else {
            if (!values.searchMaterial) {
              this.nuevoCostoForm.patchValue({ idItem: null, costoUnitario: 0 }, { emitEvent: false });
            }
          }
        });
      }
    });
  }

  async onFilesSelected(event: any) {
    const files: FileList = event.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const url = await firstValueFrom(this.parteDiarioService.uploadImage(file));
        this.fotos.update(prev => [...prev, { urlCloud: url, descripcion: file.name }]);
      } catch (err) {
        console.error('Error al subir:', err);
      }
    }
  }

  removeFoto(foto: EvidenciaFoto) {
    this.fotos.update(prev => prev.filter(f => f.urlCloud !== foto.urlCloud));
  }



  addCosto() {
    const tab = this.costoTab();
    let descripcion = this.nuevoCostoForm.value.descripcion;
    let costoUnitario = this.nuevoCostoForm.value.costoUnitario;
    let cantidad = this.nuevoCostoForm.value.cantidad;
    let idItem = this.nuevoCostoForm.value.idItem;

    if (!idItem) {
      alert('Por favor seleccione un elemento de la lista');
      return;
    }

    if (tab === 'MANO_DE_OBRA') {
      cantidad = 1;
    }

    if (!cantidad || cantidad <= 0 || costoUnitario == null || costoUnitario < 0) {
      alert('Por favor ingrese montos válidos');
      return;
    }

    if (tab === 'MATERIAL' || tab === 'EQUIPO' || tab === 'OTROS') {
      const mat = this.materiales().find(m => m.idMaterial === idItem);
      if (mat && cantidad > mat.stockActual) {
        alert(`Stock insuficiente. Stock actual de ${mat.nombreMaterial} es ${mat.stockActual}`);
        return;
      }
    }

    const costoGroup = this.fb.group({
      tipo: [tab],
      idItem: [idItem],
      descripcion: [descripcion, Validators.required],
      cantidad: [cantidad, Validators.required],
      costoUnitario: [costoUnitario, Validators.required],
      costoTotal: [
        (cantidad || 0) * (costoUnitario || 0),
        Validators.required
      ]
    });
    (this.form.get('costos') as FormArray).push(costoGroup);

    this.nuevoCostoForm.reset({ idItem: null, searchMaterial: '', searchEmpleado: '', cantidad: 1, costoUnitario: 0, descripcion: '' });
  }

  removeCosto(index: number) {
    (this.form.get('costos') as FormArray).removeAt(index);
  }

  async operate() {
    if (this.form.invalid) return;

    const costosMapeados = (this.form.value.costos || []).map((c: any) => ({
      ...c,
      costoTotal: (c.cantidad || 0) * (c.costoUnitario || 0)
    }));

    const parteDiario: ParteDiario = {
      ...this.form.value,
      fechaInforme: this.form.value.fechaInforme ? `${this.form.value.fechaInforme}T00:00:00` : new Date().toISOString(),
      idObra: this.obraseleccionada(),
      fotos: this.fotos(),
      costos: costosMapeados as CostoDiario[],
      movimientos: []
    } as ParteDiario;

    try {
      await firstValueFrom(this.parteDiarioService.save(parteDiario));
      const materialesAActualizar = costosMapeados
        .filter(c => (c.tipo === 'MATERIAL' || c.tipo === 'EQUIPO' || c.tipo === 'OTROS') && c.idItem)
        .map(c => {
          const mat = this.materiales().find(m => m.idMaterial === c.idItem);
          if (mat) {
            const updatedMat = { ...mat, stockActual: mat.stockActual - (c.cantidad || 0) };
            return this.materialService.update(mat.idMaterial!, updatedMat);
          }
          return null;
        })
        .filter(obs => obs !== null);

      if (materialesAActualizar.length > 0) {
        try {
          await firstValueFrom(forkJoin(materialesAActualizar));
          alert('Parte Diario y stock de materiales guardados con éxito');
          const data = await firstValueFrom(this.materialService.findAll());
          this.materialService.setListChange(data);
          this.form.reset();
          (this.form.get('costos') as FormArray).clear();
          this.fotos.set([]);
        } catch (err) {
          console.error('Error al actualizar stock:', err);
          alert('Parte Diario guardado, pero hubo un error al actualizar el stock de materiales');
        }
      } else {
        alert('Parte Diario Guardado con éxito');
        this.form.reset();
        (this.form.get('costos') as FormArray).clear();
        this.fotos.set([]);
      }
    } catch (err) {
      console.error('Error al guardar Parte Diario:', err);
    }
  }
}