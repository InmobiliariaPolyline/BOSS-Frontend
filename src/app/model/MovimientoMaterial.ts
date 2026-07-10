export class MovimientoMaterial {
    idMovimiento?: number;
    idMaterial: number;
    cantidad: number;
    tipoMovimiento: 'ENTRADA' | 'SALIDA';
}