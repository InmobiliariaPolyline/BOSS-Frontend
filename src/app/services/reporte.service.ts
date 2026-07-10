import { computed, inject, Injectable, signal } from '@angular/core';
import { ParteDiarioService } from './parte-diario.service';
import { ObraService } from './obra.service';
import { ParteDiario } from '../model/parteDiario';
import { firstValueFrom } from 'rxjs';

export interface HorasSemana {
  semana: string;
  horas: number;
}

export interface CostoCategoria {
  label: string;
  tipo: string;
  total: number;
  porcentaje: number;
  color: string;
}

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private parteDiarioService = inject(ParteDiarioService);
  private obraService = inject(ObraService);

  private _partes = signal<ParteDiario[]>([]);
  private _loading = signal(false);

  readonly $loading = this._loading.asReadonly();

  // Filtra solo los partes de la obra activa
  readonly $partesObra = computed(() => {
    const obra = this.obraService.$selectedObra();
    const partes = this._partes();
    if (!obra) return [];
    return partes.filter(p => p.idObra === obra.idObra);
  });

  // Agrupa jornadaLaboral por semana del año
  readonly $horasPorSemana = computed((): HorasSemana[] => {
    const partes = this.$partesObra();
    const mapaSemanasMap = new Map<number, number>();

    partes.forEach(p => {
      const fecha = new Date(p.fechaInforme);
      const semana = this.getSemanaDelAnio(fecha);
      mapaSemanasMap.set(semana, (mapaSemanasMap.get(semana) ?? 0) + p.jornadaLaboral);
    });

    return Array.from(mapaSemanasMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map((entry, i) => ({ semana: `S${i + 1}`, horas: entry[1] }));
  });

  // Suma costoTotal por tipo desde todos los CostoDiario
  readonly $distribucionCostos = computed((): CostoCategoria[] => {
    const partes = this.$partesObra();
    const totales = { MANO_DE_OBRA: 0, MATERIAL: 0, EQUIPO: 0, OTROS: 0 };

    partes.forEach(p => {
      p.costos?.forEach(c => {
        totales[c.tipo] = (totales[c.tipo] ?? 0) + c.costoTotal;
      });
    });

    const total = Object.values(totales).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    const config = [
      { tipo: 'MANO_DE_OBRA', label: 'Mano de obra', color: '#1a2340' },
      { tipo: 'MATERIAL',     label: 'Materiales',   color: '#f97316' },
      { tipo: 'EQUIPO',       label: 'Equipos',      color: '#4b5563' },
      { tipo: 'OTROS',        label: 'Indirectos',   color: '#9ca3af' },
    ];

    return config.map(c => ({
      ...c,
      total: totales[c.tipo as keyof typeof totales],
      porcentaje: Math.round((totales[c.tipo as keyof typeof totales] / total) * 100),
      color: c.color
    }));
  });

  async cargarPartes(): Promise<void> {
    this._loading.set(true);
    try {
      const data = await firstValueFrom(this.parteDiarioService.findAll());
      this._partes.set(data);
    } catch {
      // Manejar error de carga
    } finally {
      this._loading.set(false);
    }
  }

  private getSemanaDelAnio(fecha: Date): number {
    const inicio = new Date(fecha.getFullYear(), 0, 1);
    return Math.ceil(((fecha.getTime() - inicio.getTime()) / 86400000 + inicio.getDay() + 1) / 7);
  }
}