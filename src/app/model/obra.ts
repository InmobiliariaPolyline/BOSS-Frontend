import { Cliente } from "./cliente";

export class Obra {
    idObra: number;
    cliente: Cliente;
    nombreObra: string;
    ubicacion: string;
    presupuestoTotal: number;
    fechaInicio: string;
    fechaFinEstimada: string;
    estado: boolean;
}
