import { Directive, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appFiltroNumeros]',
  standalone: true
})
export class FiltroNumerosDirective {
  
  @Input() appFiltroNumeros: 'entero' | 'decimal' = 'entero';

  @HostListener('keydown', ['$event']) onKeyDown(event: KeyboardEvent) {
    // Permitir teclas especiales (borrar, tab, flechas, etc.)
    const permitidos = [
      'Backspace', 'Tab', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'Delete',
      'Enter', 'Escape'
    ];
    if (permitidos.includes(event.key)) {
      return;
    }

    // Permitir copiar y pegar (Ctrl+C, Ctrl+V, Cmd+C, Cmd+V)
    if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'x', 'a'].includes(event.key.toLowerCase())) {
      return;
    }

    if (this.appFiltroNumeros === 'decimal' && event.key === '.') {
      const input = event.target as HTMLInputElement;
      if (input.value.includes('.')) {
        event.preventDefault(); // Solo un punto
      }
      return;
    }

    // Bloquear si no es un dígito numérico (0-9)
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  // Filtrar también en caso de paste o drag and drop
  @HostListener('input', ['$event']) onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const initialValue = input.value;
    let newValue = initialValue;
    
    if (this.appFiltroNumeros === 'entero') {
       newValue = initialValue.replace(/[^0-9]/g, '');
    } else {
       // Permite un punto decimal
       newValue = initialValue.replace(/[^0-9.]/g, '');
       const parts = newValue.split('.');
       if (parts.length > 2) {
         newValue = parts[0] + '.' + parts.slice(1).join('');
       }
    }
    
    if (initialValue !== newValue) {
      input.value = newValue;
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }
  }
}
