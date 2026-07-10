import { CostoDiario } from "./CostoDiario";
import { EvidenciaFoto } from "./EvidenciaFoto";
import { MovimientoMaterial } from "./MovimientoMaterial";

export class ParteDiario {
    idParteDiario?: number;
    idObra: number;
    nombreParte: string;
    fechaInforme: string;
    elaboradoPor: string;
    jornadaLaboral: number;
    cantidadEjecutada: number;
    unidadMedida: string;
    observaciones?: string;
    rendimientoReal: number;
    rendimientoEsperado: number;
    costos: CostoDiario[];
    fotos: EvidenciaFoto[];
    movimientos: MovimientoMaterial[];
}