import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

import { Usuario } from '../../../model/usuario';
import { Rol } from '../../../model/rol';
import { UsuarioService } from '../../../services/usuario.service';
import { RolService } from '../../../services/rol.service';

@Component({
  selector: 'app-nuevo-usuario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './nuevo-usuario-dialog.component.html',
  styleUrls: ['./nuevo-usuario-dialog.component.css'],
})
export class NuevoUsuarioDialogComponent implements OnInit {
  private readonly activeModal = inject(NgbActiveModal);
  private readonly usuarioService = inject(UsuarioService);
  private readonly rolService = inject(RolService);

  @Input() data: Usuario | null = null;

  estadoEdicion = false;
  usuario!: Usuario;
  roles: Rol[] = [];
  selectedRolId: number | null = null;
  errorMessage = '';

  ngOnInit() {
    this.estadoEdicion = !!this.data;
    this.usuario = this.data ? { ...this.data, password: '' } : {
      idUsuario: undefined,
      username: '',
      password: '',
      estado: true,
      roles: []
    };

    if (this.data && this.data.roles && this.data.roles.length > 0) {
      this.selectedRolId = this.data.roles[0].idRol ?? null;
    }

    this.cargarRoles();
  }

  async cargarRoles(): Promise<void> {
    try {
      this.roles = await firstValueFrom(this.rolService.findAll());
    } catch (err) {
      console.error('Error cargando roles:', err);
      this.errorMessage = 'No se pudieron cargar los roles del sistema.';
    }
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }

  filtrarCaracteres(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Permitir solo letras, números, puntos y guiones bajos
    const valor = input.value.replace(/[^a-zA-Z0-9._]/g, '');
    if (input.value !== valor) {
      input.value = valor;
      this.usuario.username = valor;
    }
  }

  async registrar(): Promise<void> {
    if (!this.usuario.username || (!this.estadoEdicion && !this.usuario.password) || !this.selectedRolId) {
      this.errorMessage = 'Por favor complete todos los campos obligatorios.';
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(this.usuario.username)) {
      this.errorMessage = 'El nombre de usuario solo puede contener letras, números, puntos y guiones bajos (sin caracteres especiales).';
      return;
    }

    const rolSeleccionado = this.roles.find(r => r.idRol === Number(this.selectedRolId));
    if (rolSeleccionado) {
      this.usuario.roles = [rolSeleccionado];
    }

    if (this.estadoEdicion && this.usuario.idUsuario) {
      // Si la contraseña está vacía en edición, eliminamos el campo para no sobreescribirla o la enviamos vacía
      if (!this.usuario.password) {
        delete this.usuario.password;
      }
      try {
        await firstValueFrom(this.usuarioService.update(this.usuario.idUsuario, this.usuario));
        this.activeModal.close(true);
      } catch (err) {
        console.error('Error al actualizar usuario:', err);
        this.errorMessage = 'Ocurrió un error al actualizar el usuario. El nombre de usuario podría estar duplicado.';
      }
    } else {
      try {
        await firstValueFrom(this.usuarioService.save(this.usuario));
        this.activeModal.close(true);
      } catch (err) {
        console.error('Error al guardar usuario:', err);
        this.errorMessage = 'Ocurrió un error al guardar el usuario. El nombre de usuario podría estar duplicado.';
      }
    }
  }
}
