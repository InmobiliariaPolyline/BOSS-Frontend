export interface ObraArchivo {
  idObraArchivo?: number;
  idObra: number;
  nombreArchivo: string;
  tipoArchivo: string; // 'DWG' | 'EXCEL' | 'DOCX'
  categoria?: string;
  fileIdNube?: string;
  proveedorNube: 'GOOGLE_DRIVE' | 'TERABOX';
  urlAcceso?: string;
  tamano?: string;
  version?: string;
  estadoSincronizacion?: string;
  ultimaModificacion?: string;
}
