import { Component, inject, OnInit, computed } from '@angular/core';
import { ReporteService } from '../../services/reporte.service';
import { ObraService } from '../../services/obra.service';

// npm install 
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reporte',
  standalone: true,
  imports: [],
  templateUrl: './reporte.component.html',
  styleUrl: './reporte.component.css',
})
export class ReporteComponent implements OnInit {
  private reporteService = inject(ReporteService);
  private obraService   = inject(ObraService);

  readonly $obra    = this.obraService.$selectedObra;
  readonly $loading = this.reporteService.$loading;
  readonly $horas   = this.reporteService.$horasPorSemana;
  readonly $costos  = this.reporteService.$distribucionCostos;

  readonly $maxHoras = computed(() =>
    Math.max(...this.$horas().map(h => h.horas), 1)
  );

  readonly reportes = [
    { id: 1, nombre: 'Reporte semanal de avance',   tipo: 'excel' },
    { id: 2, nombre: 'Valorización mensual',         tipo: 'pdf'   },
    { id: 3, nombre: 'Análisis de productividad',    tipo: 'excel' },
    { id: 4, nombre: 'Estado de caja chica',         tipo: 'excel' },
    { id: 5, nombre: 'Compras por proveedor',        tipo: 'excel' },
    { id: 6, nombre: 'Asistencia de personal',       tipo: 'pdf'   },
  ];

  readonly CIRCUNFERENCIA = 439.8;

  ngOnInit(): void {
    this.reporteService.cargarPartes();
  }

  // ── Helpers gráficos ────────────────────────────────────────────────────────

  getBarHeight(horas: number): number {
    return Math.round((horas / this.$maxHoras()) * 100);
  }

  getSegmentoDash(porcentaje: number): string {
    const arco = (porcentaje / 100) * this.CIRCUNFERENCIA;
    return `${arco} ${this.CIRCUNFERENCIA - arco}`;
  }

  getSegmentoOffset(index: number): number {
    const costos = this.$costos();
    let acumulado = 0;
    for (let i = 0; i < index; i++) {
      acumulado += costos[i].porcentaje;
    }
    return this.CIRCUNFERENCIA - (acumulado / 100) * this.CIRCUNFERENCIA;
  }

  // ── Nombre de la obra (helper) ──────────────────────────────────────────────

  private get nombreObra(): string {
    return this.$obra()?.nombreObra ?? 'Obra';
  }

  private get fechaHoy(): string {
    return new Date().toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  // ── EXPORT EXCEL ────────────────────────────────────────────────────────────

  exportExcel(): void {
    const wb = XLSX.utils.book_new();

    // Hoja 1 – Horas Hombre
    const horasData = [
      ['Semana', 'Horas Hombre'],
      ...this.$horas().map(h => [h.semana, h.horas]),
    ];
    const wsHoras = XLSX.utils.aoa_to_sheet(horasData);
    XLSX.utils.book_append_sheet(wb, wsHoras, 'Horas por Semana');

    // Hoja 2 – Distribución de Costos
    const costosData = [
      ['Categoría', 'Total (S/)', 'Porcentaje (%)'],
      ...this.$costos().map(c => [c.label, c.total.toFixed(2), c.porcentaje]),
    ];
    const wsCostos = XLSX.utils.aoa_to_sheet(costosData);
    XLSX.utils.book_append_sheet(wb, wsCostos, 'Distribución Costos');

    XLSX.writeFile(wb, `Reporte_${this.nombreObra}_${this.fechaHoy.replace(/\//g, '-')}.xlsx`);
  }

  // ── EXPORT PDF ──────────────────────────────────────────────────────────────

  exportPDF(): void {
    const doc = new jsPDF();
    const obra = this.nombreObra;
    const fecha = this.fechaHoy;

    // Cabecera
    doc.setFontSize(16);
    doc.setTextColor(26, 35, 64);
    doc.text('Reporte de Indicadores', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Obra: ${obra}   |   Fecha: ${fecha}`, 14, 26);

    // Tabla Horas Hombre
    doc.setFontSize(12);
    doc.setTextColor(26, 35, 64);
    doc.text('Horas Hombre por Semana', 14, 38);

    autoTable(doc, {
      startY: 42,
      head: [['Semana', 'Horas Hombre']],
      body: this.$horas().map(h => [h.semana, h.horas.toString()]),
      headStyles: { fillColor: [26, 35, 64] },
      styles: { fontSize: 9 },
    });

    // Tabla Costos
    const afterHoras = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(26, 35, 64);
    doc.text('Distribución de Costos', 14, afterHoras);

    autoTable(doc, {
      startY: afterHoras + 4,
      head: [['Categoría', 'Total (S/)', 'Porcentaje']],
      body: this.$costos().map(c => [c.label, `S/ ${c.total.toFixed(2)}`, `${c.porcentaje}%`]),
      headStyles: { fillColor: [26, 35, 64] },
      styles: { fontSize: 9 },
    });

    doc.save(`Reporte_${obra}_${fecha.replace(/\//g, '-')}.pdf`);
  }

  // ── WHATSAPP ────────────────────────────────────────────────────────────────

  shareWhatsApp(): void {
    const obra   = this.nombreObra;
    const fecha  = this.fechaHoy;
    const horas  = this.$horas();
    const costos = this.$costos();

    const totalHH = horas.reduce((acc, h) => acc + h.horas, 0);
    const ultimaSem = horas.at(-1);

    const lineasCostos = costos
      .map(c => `  • ${c.label}: S/ ${c.total.toFixed(2)} (${c.porcentaje}%)`)
      .join('\n');

    const mensaje =
      `📋 *Reporte de Obra*\n` +
      `🏗️ ${obra}\n` +
      `📅 ${fecha}\n\n` +
      `⏱️ *Horas Hombre*\n` +
      `  Total acumulado: ${totalHH} HH\n` +
      (ultimaSem ? `  Última semana (${ultimaSem.semana}): ${ultimaSem.horas} HH\n` : '') +
      `\n💰 *Distribución de Costos*\n` +
      `${lineasCostos}\n\n` +
      `_Generado desde el sistema de gestión de obras_`;

    const url = `https://wa.me/51943812536?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  // ── GENERAR REPORTES INDIVIDUALES ───────────────────────────────────────────

  generarReporte(id: number): void {
    const reporte = this.reportes.find(r => r.id === id);
    if (!reporte) return;

    if (reporte.tipo === 'excel') {
      this.generarReporteExcel(id, reporte.nombre);
    } else {
      this.generarReportePDF(id, reporte.nombre);
    }
  }

  private generarReporteExcel(id: number, nombre: string): void {
    const wb  = XLSX.utils.book_new();
    const obra = this.nombreObra;

    let data: any[][] = [];

    switch (id) {
      case 1: // Reporte semanal de avance
        data = [
          [`Reporte Semanal de Avance — ${obra}`],
          [`Fecha: ${this.fechaHoy}`],
          [],
          ['Semana', 'Horas Hombre', 'Variación'],
          ...this.$horas().map((h, i, arr) => {
            const anterior = arr[i - 1]?.horas ?? h.horas;
            const variacion = i === 0 ? '—' : `${((h.horas - anterior) / anterior * 100).toFixed(1)}%`;
            return [h.semana, h.horas, variacion];
          }),
        ];
        break;

      case 3: // Análisis de productividad
        data = [
          [`Análisis de Productividad — ${obra}`],
          [`Fecha: ${this.fechaHoy}`],
          [],
          ['Semana', 'Horas Hombre', '% del Total'],
          ...(() => {
            const total = this.$horas().reduce((s, h) => s + h.horas, 0);
            return this.$horas().map(h => [
              h.semana,
              h.horas,
              total > 0 ? `${((h.horas / total) * 100).toFixed(1)}%` : '0%',
            ]);
          })(),
        ];
        break;

      case 4: // Estado de caja chica
        data = [
          [`Estado de Caja Chica — ${obra}`],
          [`Fecha: ${this.fechaHoy}`],
          [],
          ['Categoría', 'Monto (S/)', 'Porcentaje'],
          ...this.$costos().map(c => [c.label, c.total.toFixed(2), `${c.porcentaje}%`]),
          [],
          ['TOTAL', this.$costos().reduce((s, c) => s + c.total, 0).toFixed(2), '100%'],
        ];
        break;

      case 5: // Compras por proveedor
        data = [
          [`Compras por Proveedor — ${obra}`],
          [`Fecha: ${this.fechaHoy}`],
          [],
          ['Categoría de costo', 'Total (S/)'],
          ...this.$costos().map(c => [c.label, c.total.toFixed(2)]),
        ];
        break;

      default:
        data = [[nombre], [`Fecha: ${this.fechaHoy}`], [], ['Sin datos disponibles']];
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, nombre.substring(0, 31));
    XLSX.writeFile(wb, `${nombre.replace(/ /g, '_')}_${this.fechaHoy.replace(/\//g, '-')}.xlsx`);
  }

  private generarReportePDF(id: number, nombre: string): void {
    const doc  = new jsPDF();
    const obra = this.nombreObra;

    // Cabecera común
    doc.setFontSize(15);
    doc.setTextColor(26, 35, 64);
    doc.text(nombre, 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Obra: ${obra}   |   Fecha: ${this.fechaHoy}`, 14, 26);

    switch (id) {
      case 2: // Valorización mensual
        autoTable(doc, {
          startY: 34,
          head: [['Categoría', 'Total (S/)', 'Porcentaje']],
          body: this.$costos().map(c => [c.label, `S/ ${c.total.toFixed(2)}`, `${c.porcentaje}%`]),
          foot: [['TOTAL', `S/ ${this.$costos().reduce((s, c) => s + c.total, 0).toFixed(2)}`, '100%']],
          headStyles: { fillColor: [26, 35, 64] },
          footStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 9 },
        });
        break;

      case 6: // Asistencia de personal
        autoTable(doc, {
          startY: 34,
          head: [['Semana', 'Horas Hombre']],
          body: this.$horas().map(h => [h.semana, `${h.horas} HH`]),
          foot: [['TOTAL', `${this.$horas().reduce((s, h) => s + h.horas, 0)} HH`]],
          headStyles: { fillColor: [26, 35, 64] },
          footStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 9 },
        });
        break;
    }

    doc.save(`${nombre.replace(/ /g, '_')}_${this.fechaHoy.replace(/\//g, '-')}.pdf`);
  }
}