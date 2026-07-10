export class Material {
  idMaterial: number = 0;
  idObra: number = 0;
  nombreMaterial: string = '';
  categoria: string = 'Materiales';
  unidadMedida: string = '';
  precioUnitario: number = 0;
  stockActual: number = 0;
  fechaCompra: string = new Date().toISOString().split('T')[0];
}