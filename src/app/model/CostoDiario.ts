export type TipoCosto = 'MANO_DE_OBRA' | 'MATERIAL' | 'EQUIPO' | 'OTROS';

export class CostoDiario {
    idCosto?: number;
    tipo: TipoCosto;
    descripcion: string;
    cantidad: number;
    costoUnitario: number;
    costoTotal: number;
}