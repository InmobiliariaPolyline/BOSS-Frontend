import { Component, inject, ChangeDetectionStrategy, OnInit, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, FormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ObraService } from '../../services/obra.service';
import { ClienteService } from '../../services/cliente.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente } from '../../model/cliente';
import { toSignal } from '@angular/core/rxjs-interop';
import { FiltroTextoDirective } from '../../shared/directives/filtro-texto.directive';
import { FiltroNumerosDirective } from '../../shared/directives/filtro-numeros.directive';
import { FiltroFechasDirective } from '../../shared/directives/filtro-fechas.directive';
import { firstValueFrom } from 'rxjs';

const dateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const start = control.get('fechaInicio')?.value;
  const end = control.get('fechaFinEstimada')?.value;
  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate <= startDate) {
      return { dateRangeInvalid: true };
    }
  }
  return null;
};

@Component({
  selector: 'app-modal-obra-cliente',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    FiltroTextoDirective,
    FiltroNumerosDirective,
    FiltroFechasDirective,
  ],
  templateUrl: './modal-obra-cliente.component.html',
  styleUrl: './modal-obra-cliente.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalObraClienteComponent implements OnInit {
  private readonly obraService = inject(ObraService);
  private readonly activeModal = inject(NgbActiveModal);
  private readonly clienteService = inject(ClienteService);

  codigoPais = '+51';
  paises = [
    { codigo: '+51', nombre: 'Perú' },
    { codigo: '+57', nombre: 'Colombia' },
    { codigo: '+56', nombre: 'Chile' },
    { codigo: '+54', nombre: 'Argentina' },
    { codigo: '+59', nombre: 'Bolivia' },
    { codigo: '+593', nombre: 'Ecuador' },
    { codigo: '+595', nombre: 'Paraguay' },
    { codigo: '+598', nombre: 'Uruguay' },
    { codigo: '+58', nombre: 'Venezuela' },
    { codigo: '+55', nombre: 'Brasil' },
    { codigo: '+1', nombre: 'EE.UU.' },
    { codigo: '+34', nombre: 'España' },
  ];


  protected $form = signal(new FormGroup({
    idObra: new FormControl<number | null>(null),
    nombreObra: new FormControl<string>('', [Validators.required, Validators.maxLength(50), Validators.minLength(3)]),
    ubicacion: new FormControl<string>('', [Validators.required, Validators.maxLength(100), Validators.minLength(3)]),
    presupuestoTotal: new FormControl<number | null>(null, Validators.min(0)),
    fechaInicio: new FormControl<string | null>(null),
    fechaFinEstimada: new FormControl<string | null>(null),
    estado: new FormControl<boolean>(true),
    idCliente: new FormControl<number | null>(null),
  }, { validators: dateRangeValidator }));

  protected $form2 = signal(new FormGroup({
    idCliente: new FormControl<number | null>(null),
    nombreCompleto: new FormControl<string | null>(null, [Validators.required, Validators.maxLength(50), Validators.minLength(3)]),
    rucDNI: new FormControl<string | null>(null, [Validators.required, Validators.pattern('^(\\d{8}|\\d{11})$')]),
    razonSocial: new FormControl<string | null>(null, [Validators.required, Validators.maxLength(100), Validators.minLength(3)]),
    direccion: new FormControl<string | null>(null, [Validators.required, Validators.maxLength(100), Validators.minLength(3)]),
    nombreContacto: new FormControl<string | null>(null, [Validators.required, Validators.maxLength(50), Validators.minLength(3)]),
    telefono: new FormControl<number | null>(null, [Validators.required, Validators.max(999999999), Validators.min(1000000)]),
    email: new FormControl<string | null>(null, [Validators.required, Validators.email, Validators.maxLength(100), Validators.minLength(3)])
  }));

  protected clientes = this.clienteService.$listChange;
  protected selectedCliente = signal<Cliente | null>(null);
  protected mostrarCrearCliente = signal(false);
  protected showClienteDropdown = signal(false);
  protected searchCliente = new FormControl<string>('');

  private readonly searchVal = toSignal(this.searchCliente.valueChanges, { initialValue: '' });

  protected filteredClientes = computed(() => {
    const search = (this.searchVal() || '').toLowerCase();
    return this.clientes().filter(c =>
      (c.nombreCompleto || '').toLowerCase().includes(search) ||
      (c.rucDNI || '').toLowerCase().includes(search)
    );
  });

  constructor() {
    effect(() => {
      const val = this.searchVal();
      if (!val) {
        untracked(() => {
          this.selectedCliente.set(null);
          this.$form().patchValue({ idCliente: null });
        });
      }
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.clienteService.findAll());
      this.clienteService.setListChange(data);
    } catch (err) {
      console.error(err);
    }
  }

  selectCliente(cliente: Cliente) {
    this.selectedCliente.set(cliente);
    this.searchCliente.setValue(cliente.nombreCompleto, { emitEvent: false });
    this.$form().patchValue({ idCliente: cliente.idCliente });
    this.showClienteDropdown.set(false);
  }

  activarCrearCliente() {
    this.mostrarCrearCliente.set(true);
    this.selectedCliente.set(null);
    this.searchCliente.setValue('', { emitEvent: false });
    this.$form().patchValue({ idCliente: null });
  }

  cancelarCrearCliente() {
    this.mostrarCrearCliente.set(false);
    this.$form2().reset();
  }

  async registrar(): Promise<void> {
    if (this.$form().valid) {
      const datosObra = this.$form().value;

      if (this.mostrarCrearCliente()) {
        if (this.$form2().valid) {
          const datosCliente = {
            ...this.$form2().value,
            telefono: Number(this.$form2().value.telefono)
          };
          try {
            const clienteCreado: any = await firstValueFrom(this.clienteService.save(datosCliente as any));
            datosObra.idCliente = clienteCreado.idCliente;
            await this.guardarObra(datosObra);
          } catch (error) {
            console.error(error);
          }
        }
      } else {
        if (this.selectedCliente()) {
          datosObra.idCliente = this.selectedCliente()!.idCliente;
          await this.guardarObra(datosObra);
        }
      }
    }
  }

  private async guardarObra(datosObra: any): Promise<void> {
    try {
      await firstValueFrom(this.obraService.save(datosObra as any));
      this.activeModal.close(true);
    } catch (error) {
      console.error(error);
    }
  }

  cerrar(): void {
    this.activeModal.dismiss();
  }
}
