import { Component, ElementRef, OnInit, Renderer2, computed, inject, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

import { FormsModule } from '@angular/forms';

import { Obra } from '../../model/obra';
import { ObraService } from '../../services/obra.service';
import { ModalObraClienteComponent } from '../modal-obra-cliente/modal-obra-cliente.component';
import { LoginService } from '../../services/login.service';

type NavigationItem = {
  icon: string;
  label: string;
  route: string;
  exempt?: boolean;
};

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent implements OnInit {
  protected readonly obraService = inject(ObraService);
  private readonly dialog = inject(NgbModal);
  private readonly router = inject(Router);
  private readonly renderer = inject(Renderer2);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private removeDocumentClickListener?: () => void;
  private readonly loginService = inject(LoginService);

  readonly sidebarOpen = signal(false);
  readonly obraPanelOpen = signal(false);
  readonly selectedObraId = signal<number | null>(null);
  readonly isDarkMode = signal(false);
  readonly currentUrl = signal(this.router.url);
  readonly searchObra = signal<string>('');

  readonly navigationItems: NavigationItem[] = [
  { icon: 'grid-1x2', label: 'Dashboard', route: '/pages/dashboard' },
  { icon: 'check2-square', label: 'Partes Diarios', route: '/pages/partes-diarios' },
  { icon: 'archive', label: 'Inventario', route: '/pages/inventario' },
  { icon: 'cash-coin', label: 'Caja Chica', route: '/pages/caja-chica' },
  { icon: 'heart', label: 'Donaciones', route: '/pages/donaciones' },
  ...(this.loginService.isJefe() || this.loginService.isDeveloper()
    ? [{ icon: 'people', label: 'Trabajadores', route: '/pages/trabajadores' }]
    : []),
  { icon: 'graph-up', label: 'Reportes', route: '/pages/reportes' },
  ...(this.loginService.isDeveloper()
    ? [{ icon: 'people-fill', label: 'Usuarios', route: '/pages/usuarios', exempt: true }]
    : []),
  ];
  readonly isJefe = this.loginService.isJefe();
  readonly isDeveloper = this.loginService.isDeveloper();

  readonly obras = this.obraService.$listChange;

  readonly hasObras = computed(() => this.obras().length > 0);

  readonly filteredObras = computed(() => {
    const search = this.searchObra().toLowerCase().trim();
    const list = this.obras();
    if (!search) return list;
    return list.filter((o) =>
      (o.nombreObra || '').toLowerCase().includes(search) ||
      (o.ubicacion || '').toLowerCase().includes(search) ||
      (`obr-${o.idObra}`).toLowerCase().includes(search) ||
      (`${o.idObra}`).includes(search)
    );
  });

  readonly selectedObra = computed(() => {
    const obras = this.obras();
    const selectedId = this.selectedObraId();
    if (selectedId === null) return obras[0] ?? null;
    return obras.find((o) => o.idObra === selectedId) ?? obras[0] ?? null;
  });

  private navigationEnd = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    )
  );

  constructor() {
    effect(() => {
      const event = this.navigationEnd();
      if (event) {
        untracked(() => {
          this.closeSidebar();
          this.closeObraPanel();
          this.currentUrl.set(event.urlAfterRedirects);
        });
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.initObrasData();
    this.initTheme();

    // Escucha clics fuera del menú desplegable para cerrarlo automáticamente
    this.removeDocumentClickListener = this.renderer.listen('document', 'click', (event: MouseEvent) =>
      this.handleDocumentClick(event)
    );
  }

  ngOnDestroy(): void {
    this.removeDocumentClickListener?.();
  }

  private initTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      this.isDarkMode.set(true);
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-bs-theme', 'dark');
    } else {
      this.isDarkMode.set(false);
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.removeAttribute('data-bs-theme');
    }
  }

  toggleTheme(): void {
    if (this.isDarkMode()) {
      this.isDarkMode.set(false);
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.removeAttribute('data-bs-theme');
      localStorage.setItem('theme', 'light');
    } else {
      this.isDarkMode.set(true);
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-bs-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.loginService.logout());
    } catch {
      // Ignorar error de cierre de sesión
    } finally {
      this.redirigirAlLogin();
    }
  }

  private redirigirAlLogin(): void {
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }
  closeSidebar(): void { this.sidebarOpen.set(false); }
  toggleObraPanel(): void {
    this.obraPanelOpen.update(v => !v);
    if (!this.obraPanelOpen()) this.searchObra.set('');
  }
  closeObraPanel(): void {
    this.obraPanelOpen.set(false);
    this.searchObra.set('');
  }

  selectObra(obra: Obra): void {
    if (obra.idObra !== undefined) {
      this.selectedObraId.set(obra.idObra);
    }
    this.obraService.setSelectedObra(obra);
    this.closeObraPanel();
    this.closeSidebar();
  }

  openCreateObraDialog(): void {
    this.closeObraPanel();
    const modalRef = this.dialog.open(ModalObraClienteComponent, {
      size: 'lg',
      windowClass: 'create-obra-dialog-panel',
      backdrop: 'static'
    });

    modalRef.result.then((result) => {
      if (result) {
        this.initObrasData();
      }
    }).catch(() => {
      // Modal dismissed
    });
  }

  trackByObraId(_: number, obra: Obra): number | string {
    return obra.idObra;
  }

  private async initObrasData(): Promise<void> {
    try {
      const obras = await firstValueFrom(this.obraService.findAll());
      this.obraService.setListChange(obras ?? []);
      if (obras && obras.length > 0) {
        this.selectedObraId.set(obras[0].idObra ?? null);
        this.obraService.setSelectedObra(obras[0]);
      }
    } catch {
      this.obraService.setListChange([]);
    }
  }

  private handleDocumentClick(event: MouseEvent): void {
    if (!this.obraPanelOpen()) return;
    const target = event.target;
    if (!(target instanceof Node)) return;

    const element = this.elementRef.nativeElement;
    const clickedInsidePanel = element.querySelector('.obra-panel')?.contains(target) ?? false;
    const clickedOnSelector = element.querySelector('.obra-selector')?.contains(target) ?? false;

    if (!clickedInsidePanel && !clickedOnSelector) {
      this.closeObraPanel();
    }
  }
}