module.exports = {
  proveedores: [
    'idproveedor',
    'nombre_contacto',
    'cargo_contacto',
    'email_contacto',
    'direccion',
    'ciudad',
    'pais',
    'telefono',
    'url',
    'descripcion',
    'fecha',
    'status',
    'codigo',
    'licencia_comercial',
    'tipo_licencia',
    'ruc',
    'fax',
    'dv'
  ],
  activos: [
    'idactivo',
    'tipoitem',
    'codigo',
    'nombre',
    'marca',
    'descripcion',
    'test'
  ],
  medidas: [
    'idmedida', 'abreviatura', 'nombre', 'descripcion'
  ],
  requisiciones: [
    'idrequisicion',
    'idusuario',
    'numero_requisicion',
    'fecha',
    'descripcion',
    'cotizacion1',
    'cotizacion2',
    'cotizacion3',
    'idverificador',
    'tipo',
    'codigo_presupuestario',
    'codigo_financiero',
    'fondo'
  ],
  ordenes: [
    'idorden',
    'idrequisicion',
    'idproveedor',
    'numero',
    'fecha',
    'status',
    'lugar_entrega',
    'codigo_presupuestario',
    'codigo_financiero',
    'fianza_cumplimiento',
    'subtotal',
    'descuento',
    'itbm',
    'total',
    'observaciones'
  ]
};
