import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appFiltroTexto]',
  standalone: true
})
export class FiltroTextoDirective {

  @HostListener('input', ['$event']) onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const initialValue = input.value;
    // Remueve caracteres extraños, permite alfanuméricos, espacios, y puntuación común
    const newValue = initialValue.replace(/[*+¨´}{[\]^~<>\\|$=#%&]/g, '');
    
    if (initialValue !== newValue) {
      input.value = newValue;
      input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }
  }
}
