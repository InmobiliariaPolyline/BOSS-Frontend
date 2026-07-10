import { Component, inject, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirmar-dialog',
  standalone: true,
  imports: [
  ],
  templateUrl: './confirmar-dialog.component.html',
  styleUrls: ['./confirmar-dialog.component.css'],
})
export class ConfirmDialogComponent {
  private readonly activeModal = inject(NgbActiveModal);
  @Input() data!: { nombre: string };

  cancelar(): void {
    this.activeModal.close(false);
  }

  confirmar(): void {
    this.activeModal.close(true);
  }
}