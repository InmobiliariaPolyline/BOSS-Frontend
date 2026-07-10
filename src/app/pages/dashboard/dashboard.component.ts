import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ObraService } from '../../services/obra.service';
import { ParteDiarioService } from '../../services/parte-diario.service';
import { CajaChicaService } from '../../services/caja-chica.service';
import { GastoCajaService } from '../../services/gasto-caja.service';
import { DonacionesService } from '../../services/donaciones.service';
import { ParteDiario } from '../../model/parteDiario';
import { firstValueFrom } from 'rxjs';

export interface KpiItem {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  isWarning?: boolean;
}

export interface SemaphoreItem {
  label: string;
  value: string;
  status: 'green' | 'yellow' | 'red';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly obraService = inject(ObraService);
  private readonly parteDiarioService = inject(ParteDiarioService);
  private readonly cajaChicaService = inject(CajaChicaService);
  private readonly gastoCajaService = inject(GastoCajaService);
  private readonly donacionesService = inject(DonacionesService);

  // 1. Filtro de vista y hover
  readonly viewMode = signal<'mensual' | 'semanal'>('mensual');
  readonly showHistory = signal(false);
  readonly hoveredIndex = signal<number | null>(null);
  readonly selectedImageUrl = signal<string | null>(null);

  // 2. Filtrar partes diarios de la obra seleccionada reactivamente
  readonly partesObraActiva = computed(() => {
    const obra = this.obraService.$selectedObra();
    if (!obra || !obra.idObra) return [];
    return this.parteDiarioService.$listChange().filter(p => p.idObra === obra.idObra);
  });

  // Historial ordenado por fecha (descendente)
  readonly historialPartesOrdenado = computed(() => {
    return [...this.partesObraActiva()].sort((a, b) => {
      return new Date(b.fechaInforme).getTime() - new Date(a.fechaInforme).getTime();
    });
  });

  // Función auxiliar para calcular desglose de costos de un parte
  obtenerDesgloseCostos(parte: ParteDiario) {
    const desglose = {
      material: 0,
      equipo: 0,
      manoObra: 0,
      subcontrato: 0,
      total: 0
    };

    if (parte.costos && parte.costos.length > 0) {
      parte.costos.forEach(c => {
        const monto = c.costoTotal || 0;
        desglose.total += monto;
        const tipo = c.tipo?.toUpperCase() || '';
        if (tipo.includes('MATERIAL')) desglose.material += monto;
        else if (tipo.includes('EQUIPO')) desglose.equipo += monto;
        else if (tipo.includes('MANO') || tipo.includes('OBRA')) desglose.manoObra += monto;
        else if (tipo.includes('SUBCONTRATO')) desglose.subcontrato += monto;
      });
    }

    return desglose;
  }

  // 3. Determinar si existe información suficiente para renderizar el gráfico
  readonly hasChartData = computed(() => {
    const obra = this.obraService.$selectedObra();
    const partes = this.partesObraActiva();
    if (!obra || !obra.idObra) return false;
    // Graficamos si hay presupuesto asignado o si se han registrado reportes diarios con costos
    const hasBudget = obra.presupuestoTotal !== undefined && obra.presupuestoTotal > 0;
    const hasCosts = partes.some(p => p.costos && p.costos.length > 0);
    return hasBudget || hasCosts;
  });

  // 4. Obtener lista de etiquetas del eje X (meses o semanas)
  readonly chartMonths = computed(() => {
    const obra = this.obraService.$selectedObra();
    if (!obra || !obra.idObra) return [];
    if (this.viewMode() === 'semanal') {
      return this.getWeeksList();
    }
    return this.getMonthsList(obra.fechaInicio, obra.fechaFinEstimada);
  });

  // 5. Presupuesto máximo del proyecto (incluye donaciones como ampliación del presupuesto)
  readonly maxBudget = computed(() => {
    const obra = this.obraService.$selectedObra();
    if (!obra) return 0;

    const donaciones = this.donacionesService.$listChange();
    const donacionesObra = donaciones.filter((d: any) => (d.obra?.idObra || d.idObra) === obra.idObra);
    const totalDonaciones = donacionesObra.reduce((sum, d) => sum + (Number(d.montoTotal) || 0), 0);

    return (obra.presupuestoTotal || 0) + totalDonaciones;
  });

  // Valor máximo a representar en el eje Y (el mayor entre el presupuesto y los valores reales/planificados)
  readonly chartMaxYValue = computed(() => {
    const budget = this.maxBudget();
    const mode = this.viewMode();
    let baseBudget = budget;

    if (mode === 'semanal') {
      const obra = this.obraService.$selectedObra();
      if (obra && obra.fechaInicio && obra.fechaFinEstimada) {
        const totalMonths = this.getMonthsList(obra.fechaInicio, obra.fechaFinEstimada).length;
        if (totalMonths > 0) {
          baseBudget = budget / totalMonths;
        }
      }
    }

    const valorizados = this.valorizadoValues();
    const reales = this.realValues();

    let max = baseBudget;
    valorizados.forEach(v => { if (v > max) max = v; });
    reales.forEach(r => { if (r > max) max = r; });

    // Si es 0 o menor, retornamos un valor mínimo por defecto para evitar divisiones entre cero
    return max > 0 ? max : 1000;
  });

  // 6. Generar línea de planificado (Curva S acumulada utilizando smoothstep)
  readonly valorizadoValues = computed(() => {
    const budget = this.maxBudget();
    const N = this.chartMonths().length;
    if (budget <= 0 || N === 0) return [];
    const mode = this.viewMode();
    let targetBudget = budget;

    if (mode === 'semanal') {
      const obra = this.obraService.$selectedObra();
      if (obra && obra.fechaInicio && obra.fechaFinEstimada) {
        const totalMonths = this.getMonthsList(obra.fechaInicio, obra.fechaFinEstimada).length;
        if (totalMonths > 0) {
          targetBudget = budget / totalMonths;
        }
      }
    }

    const valorizado = [];
    for (let i = 0; i < N; i++) {
      const t = (i + 1) / N;
      const pct = 3 * t * t - 2 * t * t * t; // Curva S matemática
      valorizado.push(targetBudget * pct);
    }
    return valorizado;
  });

  // 7. Calcular costos reales acumulados desde los partes diarios (agrupados por mes o semana)
  readonly realValues = computed(() => {
    const timeLabels = this.chartMonths();
    const N = timeLabels.length;
    const partes = this.partesObraActiva();
    if (N === 0) return [];

    const obra = this.obraService.$selectedObra();
    const mode = this.viewMode();
    const actualCosts = new Array(N).fill(0);

    const nameMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

    // Determinar año y mes objetivo (por defecto el mes actual)
    let targetYear = new Date().getFullYear();
    let targetMonth = new Date().getMonth();

    if (mode === 'semanal' && partes.length > 0) {
      const now = new Date();
      const hasCurrentMonthData = partes.some(p => {
        const date = new Date(p.fechaInforme);
        return !isNaN(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      });

      if (!hasCurrentMonthData) {
        let mostRecentDate = new Date(0);
        partes.forEach(p => {
          const date = new Date(p.fechaInforme);
          if (!isNaN(date.getTime()) && date.getTime() > mostRecentDate.getTime()) {
            mostRecentDate = date;
          }
        });
        if (mostRecentDate.getTime() > 0) {
          targetYear = mostRecentDate.getFullYear();
          targetMonth = mostRecentDate.getMonth();
        }
      }
    }

    partes.forEach(p => {
      const date = new Date(p.fechaInforme);
      if (!isNaN(date.getTime())) {
        const costSum = p.costos ? p.costos.reduce((sum, c) => sum + (c.costoTotal || 0), 0) : 0;

        if (mode === 'semanal') {
          if (date.getFullYear() === targetYear && date.getMonth() === targetMonth) {
            const day = date.getDate();
            let weekIdx = 0;
            if (day >= 1 && day <= 7) weekIdx = 0;
            else if (day >= 8 && day <= 14) weekIdx = 1;
            else if (day >= 15 && day <= 21) weekIdx = 2;
            else weekIdx = 3;

            if (weekIdx >= 0 && weekIdx < N) {
              actualCosts[weekIdx] += costSum;
            }
          }
        } else {
          const monthName = nameMonths[date.getMonth()];
          const monthIdx = timeLabels.indexOf(monthName);
          if (monthIdx !== -1) {
            actualCosts[monthIdx] += costSum;
          }
        }
      }
    });

    let cumulativeReal = 0;
    const real = [];
    let hasRealCosts = false;

    for (let i = 0; i < N; i++) {
      cumulativeReal += actualCosts[i];
      if (actualCosts[i] > 0 || cumulativeReal > 0) {
        hasRealCosts = true;
      }
      real.push(cumulativeReal);
    }

    return hasRealCosts ? real : new Array(N).fill(0);
  });

  // 8. Etiquetas del eje Y dinámicas basadas en el valor máximo real de la gráfica
  readonly yAxisLabels = computed(() => {
    const maxVal = this.chartMaxYValue();
    if (maxVal <= 0) return ['S/.0', 'S/.0', 'S/.0', 'S/.0', 'S/.0'];
    return [
      this.formatCurrency(maxVal),
      this.formatCurrency(Math.round(maxVal * 0.75)),
      this.formatCurrency(Math.round(maxVal * 0.50)),
      this.formatCurrency(Math.round(maxVal * 0.25)),
      'S/.0'
    ];
  });

  // 9. Adaptación dinámica de los semáforos a partir de Partes Diarios (Partidas) reales
  readonly partidasDiarias = computed(() => {
    const partes = this.partesObraActiva();
    return partes.map(p => {
      const real = p.rendimientoReal || 0;
      const esperado = p.rendimientoEsperado || 0;

      // Calcular rendimiento en porcentaje
      const pct = esperado > 0 ? Math.round((real / esperado) * 100) : 100;

      // Asignar color de semáforo según productividad
      let status: 'green' | 'yellow' | 'red' = 'green';
      if (pct < 85) {
        status = 'red';
      } else if (pct < 100) {
        status = 'yellow';
      }

      return {
        label: p.nombreParte,
        value: `${pct}%`,
        status: status
      };
    });
  });

  // Tarjetas KPI calculadas reactivamente a partir de los datos reales del backend
  readonly kpis = computed<KpiItem[]>(() => {
    const obra = this.obraService.$selectedObra();
    const partes = this.partesObraActiva();
    const cajas = this.cajaChicaService.$listChange();
    const gastos = this.gastoCajaService.$listChange();
    const donaciones = this.donacionesService.$listChange();

    const presupuestoBase = obra?.presupuestoTotal || 0;

    // Calcular donaciones de la obra
    const donacionesObra = obra ? donaciones.filter((d: any) => (d.obra?.idObra || d.idObra) === obra.idObra) : [];
    const totalDonaciones = donacionesObra.reduce((sum, d) => sum + (Number(d.montoTotal) || 0), 0);
    const totalDonacionesStr = `S/. ${totalDonaciones.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const recursosTotales = presupuestoBase + totalDonaciones;

    const totalSpent = partes.reduce((sum, p) => {
      const parteCost = p.costos ? p.costos.reduce((s, c) => s + (c.costoTotal || 0), 0) : 0;
      return sum + parteCost;
    }, 0);
    const execPercentage = recursosTotales > 0 ? Math.max(0, Math.min(100, Math.round((totalSpent / recursosTotales) * 100))) : 0;

    const recursosStr = this.formatCurrency(recursosTotales);
    const spentStr = this.formatCurrency(totalSpent).replace('S/. ', '');

    // 2. Avance Físico / Donaciones
    let plannedPercentage = 0;
    if (obra?.fechaInicio && obra?.fechaFinEstimada) {
      const start = new Date(obra.fechaInicio);
      const end = new Date(obra.fechaFinEstimada);
      const today = new Date();
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const totalDuration = end.getTime() - start.getTime();
        if (totalDuration > 0) {
          const elapsed = today.getTime() - start.getTime();
          const t = Math.max(0, Math.min(1, elapsed / totalDuration));
          plannedPercentage = Math.round((3 * t * t - 2 * t * t * t) * 100);
        }
      }
    }

    // 3. Saldo Caja Chica
    const activeCaja = obra ? cajas.find(c => ((c as any).obra?.idObra || c.idObra) === obra.idObra) : null;
    const activeGastos = activeCaja ? gastos.filter(g => ((g as any).cajaChica?.idCajaChica || g.idCajaChica) === activeCaja.idCajaChica) : [];

    const totalIngresos = activeGastos
      .filter(g => g.categoriaGasto?.toLowerCase() === 'ingreso')
      .reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

    const totalEgresos = activeGastos
      .filter(g => g.categoriaGasto?.toLowerCase() === 'egreso')
      .reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

    const saldoCaja = totalIngresos - totalEgresos;
    const cajaMovCount = activeGastos.length;

    return [
      {
        title: 'Saldo Caja Chica',
        value: `S/. ${saldoCaja.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        subtitle: cajaMovCount === 0 ? 'Sin movimientos' : `${cajaMovCount} movimientos`,
        icon: 'cash',
        iconBg: '#475569',
      },
      {
        title: 'Donaciones',
        value: totalDonacionesStr,
        subtitle: donacionesObra.length === 1 ? '1 donación registrada' : `${donacionesObra.length} donaciones registradas`,
        icon: 'heart-fill',
        iconBg: '#10b981',
      },
    ];
  });

  // KPI Principal (Presupuesto)
  readonly mainKpi = computed(() => {
    const obra = this.obraService.$selectedObra();
    if (!obra) return null;

    const presupuestoBase = obra.presupuestoTotal || 0;

    const donaciones = this.donacionesService.$listChange();
    const donacionesObra = donaciones.filter((d: any) => (d.obra?.idObra || d.idObra) === obra.idObra);
    const totalDonaciones = donacionesObra.reduce((sum, d) => sum + (Number(d.montoTotal) || 0), 0);

    const recursosTotales = presupuestoBase + totalDonaciones;

    const partes = this.partesObraActiva();
    const totalSpent = partes.reduce((sum, p) => {
      const parteCost = p.costos ? p.costos.reduce((s, c) => s + (c.costoTotal || 0), 0) : 0;
      return sum + parteCost;
    }, 0);

    const execPercentage = recursosTotales > 0 ? Math.max(0, Math.min(100, Math.round((totalSpent / recursosTotales) * 100))) : 0;

    let status: 'green' | 'yellow' | 'red' = 'green';
    if (execPercentage >= 100) status = 'red';
    else if (execPercentage >= 85) status = 'yellow';

    return {
      title: 'Resumen Financiero',
      presupuestoTotal: `S/. ${recursosTotales.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      presupuestoBaseStr: `S/. ${presupuestoBase.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      donacionesStr: `S/. ${totalDonaciones.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      gastado: `S/. ${totalSpent.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      percentage: execPercentage,
      status,
      hasDonaciones: totalDonaciones > 0
    };
  });

  // 10. Datos computados para el Tooltip flotante interactivo
  readonly activeTooltip = computed(() => {
    const idx = this.hoveredIndex();
    if (idx === null) return null;

    const labels = this.chartMonths();
    const valorizado = this.valorizadoValues();
    const real = this.realValues();

    if (idx < 0 || idx >= labels.length) return null;

    const title = labels[idx];
    const valAmount = valorizado[idx] ?? 0;
    const realAmount = real[idx] ?? 0;

    const xCoords = this.getXCoordinates(labels.length);
    const x = xCoords[idx] ?? 90;

    const divisor = this.chartMaxYValue() || 1;
    const maxValPoint = Math.max(valAmount, realAmount);
    const ratio = Math.max(0, Math.min(1, maxValPoint / divisor));
    const y = 240 - (ratio * 200);

    return {
      x,
      y,
      title,
      valorizado: this.formatCurrency(valAmount),
      real: this.formatCurrency(realAmount),
      yVal: Math.round(240 - (Math.max(0, Math.min(1, valAmount / divisor)) * 200)),
      yReal: Math.round(240 - (Math.max(0, Math.min(1, realAmount / divisor)) * 200))
    };
  });

  constructor() {
    this.inicializarDatos();
  }

  private async inicializarDatos(): Promise<void> {
    await Promise.all([
      this.cargarPartesDiarios(),
      this.cargarCajaChicaYGastos(),
      this.cargarDonaciones()
    ]);
  }

  setViewMode(mode: 'mensual' | 'semanal'): void {
    this.viewMode.set(mode);
    this.hoveredIndex.set(null); // Reset hover
  }

  onHoverPoint(index: number): void {
    this.hoveredIndex.set(index);
  }

  onLeavePoint(): void {
    this.hoveredIndex.set(null);
  }

  private async cargarPartesDiarios(): Promise<void> {
    try {
      const data = await firstValueFrom(this.parteDiarioService.findAll());
      this.parteDiarioService.setListChange(data || []);
    } catch (err) {
      console.error('Error cargando partes diarios desde backend:', err);
      this.parteDiarioService.setListChange([]);
    }
  }

  private async cargarCajaChicaYGastos(): Promise<void> {
    try {
      const data = await firstValueFrom(this.cajaChicaService.findAll());
      this.cajaChicaService.setListChange(data || []);
    } catch (err) {
      console.error('Error cargando cajas chicas:', err);
      this.cajaChicaService.setListChange([]);
    }

    try {
      const data = await firstValueFrom(this.gastoCajaService.findAll());
      this.gastoCajaService.setListChange(data || []);
    } catch (err) {
      console.error('Error cargando gastos de caja:', err);
      this.gastoCajaService.setListChange([]);
    }
  }

  private async cargarDonaciones(): Promise<void> {
    try {
      const data = await firstValueFrom(this.donacionesService.findAll());
      this.donacionesService.setListChange(data || []);
    } catch (err) {
      console.error('Error cargando donaciones:', err);
      this.donacionesService.setListChange([]);
    }
  }


  private getMonthsList(startStr: string, endStr: string): string[] {
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [];
    }
    const months = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    const nameMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

    while (current <= last) {
      months.push(nameMonths[current.getMonth()]);
      current.setMonth(current.getMonth() + 1);
      if (months.length > 24) break;
    }
    return months;
  }

  private getWeeksList(): string[] {
    return ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
  }

  private formatCurrency(val: number): string {
    if (val >= 1000000) {
      const num = val / 1000000;
      return `S/. ${num % 1 === 0 ? num.toFixed(0) : num.toFixed(2)}M`;
    } else if (val >= 1000) {
      const num = val / 1000;
      return `S/. ${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)}k`;
    }
    return `S/. ${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)}`;
  }

  // Getters para trazado SVG
  get valorizadoPath(): string {
    return this.generateSvgPath(this.valorizadoValues(), this.chartMaxYValue());
  }

  get valorizadoAreaPath(): string {
    return this.generateAreaPath(this.valorizadoValues(), this.chartMaxYValue());
  }

  get realPath(): string {
    return this.generateSvgPath(this.realValues(), this.chartMaxYValue());
  }

  get realAreaPath(): string {
    return this.generateAreaPath(this.realValues(), this.chartMaxYValue());
  }

  get lastValorizadoPoint() {
    return this.getLastPoint(this.valorizadoValues(), this.chartMaxYValue());
  }

  get lastRealPoint() {
    return this.getLastPoint(this.realValues(), this.chartMaxYValue());
  }

  private generateSvgPath(data: number[], maxVal: number): string {
    if (!data || data.length === 0) return '';
    const points = this.getCoordinates(data, maxVal);
    if (points.length === 0) return '';

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX1 = prev.x + (curr.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (curr.x - prev.x) / 2;
      const cpY2 = curr.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
    return path;
  }

  private generateAreaPath(data: number[], maxVal: number): string {
    const linePath = this.generateSvgPath(data, maxVal);
    if (!linePath) return '';
    const points = this.getCoordinates(data, maxVal);
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    return `${linePath} L ${lastX} 240 L ${firstX} 240 Z`;
  }

  private getLastPoint(data: number[], maxVal: number): { x: number; y: number } | null {
    if (!data || data.length === 0) return null;
    const points = this.getCoordinates(data, maxVal);
    return points[points.length - 1];
  }

  private getCoordinates(data: number[], maxVal: number): { x: number; y: number }[] {
    const xCoords = this.getXCoordinates(data.length);
    return data.map((val, idx) => {
      const x = xCoords[idx] ?? 90;
      const divisor = maxVal || 1;
      const ratio = Math.max(0, Math.min(1, val / divisor));
      const y = 240 - (ratio * 200);
      return { x, y: Math.round(y) };
    });
  }

  private getXCoordinates(count: number): number[] {
    if (count <= 1) return [90];
    const startX = 90;
    const endX = 760;
    const step = (endX - startX) / (count - 1);
    const coords = [];
    for (let i = 0; i < count; i++) {
      coords.push(Math.round(startX + i * step));
    }
    return coords;
  }
}

