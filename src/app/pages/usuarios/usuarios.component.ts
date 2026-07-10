import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

import { Usuario } from '../../model/usuario';
import { UsuarioService } from '../../services/usuario.service';
import { NuevoUsuarioDialogComponent } from './dialogs/nuevo-usuario-dialog.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
})
export class UsuariosComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly dialog = inject(NgbModal);

  protected usuarios = signal<Usuario[]>([]);
  filtro = signal('');

  usuariosFiltrados = computed(() => {
    const term = this.filtro().toLowerCase();
    if (!term) return this.usuarios();
    return this.usuarios().filter(u =>
      u.username.toLowerCase().includes(term) ||
      (u.roles && u.roles.some(r => r.nombreRol.toLowerCase().includes(term)))
    );
  });

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  async cargarUsuarios(): Promise<void> {
    try {
      const data = await firstValueFrom(this.usuarioService.findAll());
      this.usuarios.set(data || []);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  }

  abrirNuevo(): void {
    const ref = this.dialog.open(NuevoUsuarioDialogComponent, {
      size: 'md',
      backdrop: 'static'
    });
    ref.componentInstance.data = null;
    ref.result.then(guardado => {
      if (guardado) this.cargarUsuarios();
    }).catch(() => {});
  }

  editar(usuario: Usuario): void {
    const ref = this.dialog.open(NuevoUsuarioDialogComponent, {
      size: 'md',
      backdrop: 'static'
    });
    ref.componentInstance.data = usuario;
    ref.result.then(guardado => {
      if (guardado) this.cargarUsuarios();
    }).catch(() => {});
  }

  async toggleEstado(usuario: Usuario): Promise<void> {
    if (!usuario.idUsuario) return;

    // Evitar que el desarrollador logueado se desactive a sí mismo
    const token = sessionStorage.getItem('access_token');
    let loggedUsername = '';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        loggedUsername = payload.sub || '';
      } catch (e) {
        console.error('Error al decodificar token:', e);
      }
    }

    if (usuario.username === loggedUsername && usuario.estado) {
      alert('No puedes desactivar tu propio usuario.');
      return;
    }

    const originalEstado = usuario.estado;
    usuario.estado = !usuario.estado;

    try {
      await firstValueFrom(this.usuarioService.update(usuario.idUsuario, usuario));
      await this.cargarUsuarios();
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      usuario.estado = originalEstado; // revertir en caso de error
    }
  }

  async eliminar(usuario: Usuario): Promise<void> {
    if (!usuario.idUsuario) return;

    const token = sessionStorage.getItem('access_token');
    let loggedUsername = '';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        loggedUsername = payload.sub || '';
      } catch (e) {
        console.error('Error al decodificar token:', e);
      }
    }

    if (usuario.username === loggedUsername) {
      alert('No puedes eliminar tu propio usuario de la sesión actual.');
      return;
    }

    if (confirm(`¿Estás seguro de que deseas eliminar el usuario "${usuario.username}"?`)) {
      try {
        await firstValueFrom(this.usuarioService.delete(usuario.idUsuario));
        await this.cargarUsuarios();
      } catch (err) {
        console.error('Error al eliminar usuario:', err);
      }
    }
  }

  getRolesString(usuario: Usuario): string {
    if (!usuario.roles || usuario.roles.length === 0) return 'Sin rol';
    return usuario.roles.map(r => r.nombreRol).join(', ');
  }

  getRoleBadgeClass(rolName: string): string {
    switch (rolName.toUpperCase()) {
      case 'DEVELOPER':
      case 'ROOT':
        return 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25';
      case 'JEFE_OBRA':
        return 'bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25';
      case 'ASISTENTE':
        return 'bg-info bg-opacity-10 text-info border border-info border-opacity-25';
      default:
        return 'bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25';
    }
  }
}
