import { Directive, ElementRef, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: 'input[type="date"][appFiltroFechas]',
  standalone: true
})
export class FiltroFechasDirective implements OnInit {
  
  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    // Establecer el atributo min a hoy
    const hoy = new Date();
    // Ajustar por la zona horaria local
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    const fechaMin = hoy.toISOString().split('T')[0];
    this.renderer.setAttribute(this.el.nativeElement, 'min', fechaMin);
  }
}
