import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MaterialService } from '../../services/material.service';
import { Material } from '../../model/material';
import { ObraService } from '../../services/obra.service';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-material',
  standalone: true,
  imports: [
    CommonModule,
    NgbPaginationModule
  ],
  templateUrl: './material.component.html',
  styleUrl: './material.component.css',
})
export class MaterialComponent implements OnInit {

  private materialService = inject(MaterialService);
  private obraService = inject(ObraService);
  private dialog = inject(NgbModal);

  categoriaActiva = signal<string>('Todos');
  textoBusqueda = signal<string>('');


  // Paginación
  page = signal<number>(1);
  pageSize = signal<number>(10);
  totalElements = signal<number>(0);

  private obraIdSignal = computed(() => this.obraService.$selectedObra()?.idObra ?? null);

  // Mantenemos la lista completa para KPIs si se necesita, o usamos la paginada.
  // Como cambiamos a paginación, usaremos la data del servidor.
  private materialesPaginados = signal<Material[]>([]);

  // Los KPIs se calcularán sobre todos los materiales de la obra, así que cargamos todos también
  private materialesDeObra = computed(() => {
    const idObra = this.obraIdSignal();
    const todos = this.materialService.$listChange() as Material[];
    if (!idObra || !todos || !Array.isArray(todos)) return [];
    return todos.filter((m) => Number(m.idObra) === idObra);
  });

  materialesFiltrados = computed(() => {
    const lista = this.materialesPaginados();
    const categoria = this.categoriaActiva();
    const busqueda = this.textoBusqueda().toLowerCase().trim();

    if (!Array.isArray(lista)) return [];

    return lista
      .filter((m) => categoria === 'Todos' || m.categoria === categoria)
      .filter((m) =>
        !busqueda ||
        m.nombreMaterial?.toLowerCase().includes(busqueda) ||
        m.categoria?.toLowerCase().includes(busqueda) ||
        m.unidadMedida?.toLowerCase().includes(busqueda)
      );
  });

  totalItems = computed(() => this.materialesDeObra().length);
  valorInventario = computed(() =>
    this.materialesDeObra().reduce((acc, m) => acc + (m.precioUnitario * m.stockActual), 0)
  );

  constructor() {
    effect(() => {
      const idObra = this.obraIdSignal();
      const p = this.page();
      const s = this.pageSize();
      if (idObra) {
        this.cargarPagina(idObra, p, s);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.cargarMateriales(); // Para los KPIs
  }

  private async cargarMateriales(): Promise<void> {
    try {
      const data: any = await firstValueFrom(this.materialService.findAll());
      this.materialService.setListChange(data);
    } catch (err) {
      console.error('Error al cargar todos:', err);
    }
  }

  private async cargarPagina(idObra: number, page: number, size: number): Promise<void> {
    try {
      const data: any = await firstValueFrom(this.materialService.listPageableByObra(idObra, page - 1, size));
      this.materialesPaginados.set(data.content);
      this.totalElements.set(data.totalElements);
    } catch (err) {
      console.error('Error al cargar página:', err);
    }
  }

  onPageChange(newPage: number): void {
    this.page.set(newPage);
  }

  // --- Métodos de interacción ---
  async agregarItem(): Promise<void> {
    const { NuevoMaterialDialogComponent } = await import('./dialog/nuevo-material/nuevo-material.component');
    const ref = this.dialog.open(NuevoMaterialDialogComponent, {
      size: 'md',
      backdrop: 'static'
    });
    ref.componentInstance.data = null;
    ref.result.then((res) => {
      if (res) {
        this.cargarMateriales();
        if (this.obraIdSignal()) this.cargarPagina(this.obraIdSignal()!, this.page(), this.pageSize());
      }
    }).catch(() => { });
  }

  async editarItem(material: Material): Promise<void> {
    const { NuevoMaterialDialogComponent } = await import('./dialog/nuevo-material/nuevo-material.component');
    const ref = this.dialog.open(NuevoMaterialDialogComponent, {
      size: 'md',
      backdrop: 'static'
    });
    ref.componentInstance.data = material;
    ref.result.then((res) => {
      if (res) {
        this.cargarMateriales();
        if (this.obraIdSignal()) this.cargarPagina(this.obraIdSignal()!, this.page(), this.pageSize());
      }
    }).catch(() => { });
  }

  async eliminarItem(material: Material): Promise<void> {
    if (!confirm(`¿Eliminar "${material.nombreMaterial}"?`)) return;
    try {
      await firstValueFrom(this.materialService.delete(material.idMaterial));
      this.cargarMateriales();
      if (this.obraIdSignal()) this.cargarPagina(this.obraIdSignal()!, this.page(), this.pageSize());
    } catch (err) {
      console.error(err);
    }
  }

  // --- Helpers ---
  filtrarCategoria(cat: string): void { this.categoriaActiva.set(cat); }
  onBusqueda(event: Event): void { this.textoBusqueda.set((event.target as HTMLInputElement).value); }


  // ── Helpers ──
  contarCategoria(categoria: string): number {
    return this.materialesDeObra().filter((m) => m.categoria === categoria).length;
  }

  calcularEstadoStock(stock: number): 'OK' | 'Stock Bajo' {
    return stock < 50 ? 'Stock Bajo' : 'OK';
  }

  getBadgeClass(categoria: string): string {
    const map: Record<string, string> = {
      Materiales: 'badge-materiales',
      Equipo: 'badge-equipo',
      Otros: 'badge-otros',
    };
    return map[categoria] ?? 'badge-otros';
  }

  getCategoriaIcon(categoria: string): string {
    const map: Record<string, string> = {
      Materiales: 'layers',
      Equipo: 'construction',
      Otros: 'inventory_2',
    };
    return map[categoria] ?? 'inventory_2';
  }


  onCategoriaSelect(event: Event): void {
    this.filtrarCategoria((event.target as HTMLSelectElement).value);
  }

}