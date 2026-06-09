module.exports = function (t) {
  const { eq } = t;
  // normProducto
  eq('norm.tabiques', t.api.normProducto('Plancha ultra / TABIQUES'), 'Plancha ultra');
  eq('norm.enchapes', t.api.normProducto('Plancha RH / ENCHAPES'), 'Plancha RH');
  eq('norm.clavos', t.api.normProducto('Clavos de fijación'), 'Clavo de fijación');
  eq('norm.clavo', t.api.normProducto('Clavo de fijación'), 'Clavo de fijación');
  eq('norm.poste388', t.api.normProducto('Poste de 2 1/2" calibre 26 -- H=3.88'), 'Poste de 2 1/2" calibre 26 -- H=3.88');
  // torreSheetToTowerId
  const towers = [{ id: 't3', name: 'TORRE III', levels: [] }, { id: 't4', name: 'TORRE IV', levels: [] }];
  eq('torre.T4', t.api.torreSheetToTowerId('T4', towers), 't4');
  eq('torre.T3', t.api.torreSheetToTowerId('T3', towers), 't3');
  eq('torre.miss', t.api.torreSheetToTowerId('T9', towers), null);
  // --- parseRecetaWorkbook ---
  const towersP = [{ id: 't4', name: 'TORRE IV', levels: [{ id: 't4-n1' }, { id: 't4-n2' }] }];
  const hojaT4 = [
    ['ETAPA', 'MATERIAL', 'UNIDAD', 'NIVEL 1', 'NIVEL 2'],
    ['1RA ETAPA', 'Canal de 2 1/2" calibre 26', 'U', 120, 137],
    ['1RA ETAPA', 'Plancha ultra / TABIQUES', 'U', 234, 201],
    ['2DA ETAPA', 'Plancha ultra', 'U', 176, 99],
    ['4TA ETAPA', 'Reborde J', 'U', 24, 21]
  ];
  const hojaPrecios = [
    ['PRODUCTO', 'UNIDAD', 'PROVEEDOR', 'PRECIO UNITARIO (Q)'],
    ['Plancha ultra', 'U', 'SISTEGUA, S.A.', 78.5],
    ['Canal de 2 1/2" calibre 26', 'U', '', 0]
  ];
  const rW = t.api.parseRecetaWorkbook({ T4: hojaT4, PRECIOS: hojaPrecios }, towersP);
  eq('parse.version', rW.recetaV2.version, 2);
  eq('parse.n1.e1.len', rW.recetaV2.niveles['t4-n1'][0].length, 2);
  eq('parse.n1.e1.canal', rW.recetaV2.niveles['t4-n1'][0][0], { m: 'Canal de 2 1/2" calibre 26', u: 'U', c: 120 });
  eq('parse.n2.e1.canal.c', rW.recetaV2.niveles['t4-n2'][0][0].c, 137);
  eq('parse.n1.e2.plancha', rW.recetaV2.niveles['t4-n1'][1][0], { m: 'Plancha ultra', u: 'U', c: 176 });
  eq('parse.n1.e4.reborde', rW.recetaV2.niveles['t4-n1'][3][0].m, 'Reborde J');
  eq('parse.precio.plancha', rW.precios['Plancha ultra'].precio, 78.5);
  eq('parse.precio.reborde0', rW.precios['Reborde J'].precio, 0);
  t.ok('parse.avisos.array', Array.isArray(rW.avisos));
  // --- aplicarOperacionReceta (por apto) ---
  const rv = { version:3, etapas:['1RA ETAPA','2DA ETAPA','3RA ETAPA','4TA ETAPA'], niveles:{ 't4-n1':[ [ {m:'CANAL', u:'U', aptos:{a101:26,a102:24}} ], [], [], [] ] } };
  const px = {};
  t.api.aplicarOperacionReceta(rv, px, { tipo:'cantidad', levelId:'t4-n1', etapaIdx:0, material:'CANAL', aptoId:'a101', cantidadNueva:30 });
  eq('op.aptoqty', rv.niveles['t4-n1'][0][0].aptos.a101, 30);
  t.api.aplicarOperacionReceta(rv, px, { tipo:'agregar', levelId:'t4-n1', etapaIdx:0, material:'POSTE', unidad:'U', aptoId:'a101', cantidadNueva:40 });
  eq('op.agregar.len', rv.niveles['t4-n1'][0].length, 2);
  eq('op.agregar.apto', rv.niveles['t4-n1'][0][1].aptos.a101, 40);
  eq('op.agregar.precio0', px['POSTE'].precio, 0);
  t.api.aplicarOperacionReceta(rv, px, { tipo:'quitar', levelId:'t4-n1', etapaIdx:0, material:'CANAL' });
  eq('op.quitar.len', rv.niveles['t4-n1'][0].length, 1);
  eq('op.quitar.resto', rv.niveles['t4-n1'][0][0].m, 'POSTE');
  // --- resolución de nivel por NOMBRE (id real distinto del construido) ---
  const towersN = [{ id:'t4', name:'TORRE IV', levels:[{ id:'XYZ-rand', name:'NIVEL 1' }] }];
  const rN = t.api.parseRecetaWorkbook({ T4: [['ETAPA','MATERIAL','UNIDAD','NIVEL 1'],['1RA ETAPA','Canal','U',120]] }, towersN);
  eq('parse.byname', rN.recetaV2.niveles['XYZ-rand'][0][0].c, 120);
  // --- precios desde catálogo ---
  const pFake = { materiales: { proveedores: [
    { id:'pr1', nombre:'SISTEGUA', productos:[{nombre:'PLANCHA ULTRA', unidad:'U', precio:78.5}] },
    { id:'pr2', nombre:'OTRO', productos:[{nombre:'CLAVO DE FIJACIÓN', unidad:'U', precio:2}] }
  ]}};
  eq('mk.basic', t.api.matchKeyProducto('Plancha ultra'), 'PLANCHA ULTRA');
  eq('mk.tab', t.api.matchKeyProducto('Plancha ultra / TABIQUES'), 'PLANCHA ULTRA');
  const pp = t.api.precioDeProductoReceta(pFake.materiales.proveedores, 'Plancha ultra / TABIQUES');
  eq('pp.precio', pp.precio, 78.5);
  eq('pp.prov', pp.proveedor, 'SISTEGUA');
  const pc = t.api.precioDeProductoReceta(pFake.materiales.proveedores, 'Clavos de fijación');
  eq('pp.clavo', pc.precio, 2);
  t.ok('pp.none', t.api.precioDeProductoReceta(pFake.materiales.proveedores, 'Inexistente XYZ') === null);
  const pFakeR = { materiales: { proveedores: [ { id:'pr1', nombre:'X', productos:[{nombre:'TORNILLO', unidad:'U', precio:8.5, rendimiento:100}, {nombre:'PLANCHA', unidad:'U', precio:78}] } ] } };
  eq('rinde.100', t.api.precioDeProductoReceta(pFakeR.materiales.proveedores, 'TORNILLO').rendimiento, 100);
  eq('rinde.def1', t.api.precioDeProductoReceta(pFakeR.materiales.proveedores, 'PLANCHA').rendimiento, 1);
  // --- por apto ---
  const lvl = { id:'t4-n1', name:'NIVEL 1', aptos:[
    {id:'a101', name:'APARTAMENTO 101'}, {id:'a102', name:'APARTAMENTO 102'},
    {id:'acine', name:'CINE'}, {id:'apas', name:'PASILLO'}
  ]};
  eq('apto.num', t.api.resolveAptoId(lvl, '101'), 'a101');
  eq('apto.cine', t.api.resolveAptoId(lvl, 'CINE'), 'acine');
  eq('apto.pas', t.api.resolveAptoId(lvl, 'PASILLO'), 'apas');
  eq('apto.none', t.api.resolveAptoId(lvl, '999'), null);
  eq('apto.total', t.api.totalMaterialNivel({ m:'X', u:'U', aptos:{a101:26,a102:24,acine:0,apas:0} }), 50);
  const towersA = [{ id:'t4', name:'TORRE IV', levels:[lvl] }];
  const hoja = [
    ['ETAPA','MATERIAL','UNIDAD','101','102','CINE','PASILLO','TOTAL'],
    ['1RA ETAPA','CANAL','U',26,24,0,0,50],
    ['2DA ETAPA','TABLA','U',10,5,0,0,15]
  ];
  const rp = t.api.parseRecetaPorApto({ 'T4-N1': hoja }, towersA);
  eq('pa.version', rp.recetaV2.version, 3);
  eq('pa.e1', rp.recetaV2.niveles['t4-n1'][0][0], { m:'CANAL', u:'U', aptos:{a101:26,a102:24} });
  eq('pa.e2', rp.recetaV2.niveles['t4-n1'][1][0].aptos.a101, 10);
  t.ok('pa.avisos', Array.isArray(rp.avisos));
  // --- nested-arrays fix ---
  eq('etapas.norm', t.api._etapas({0:[1],1:[2],2:[],3:[]})[1][0], 2);
  eq('etapas.arr', t.api._etapas([[9],[],[],[]])[0][0], 9);
  t.ok('pa.objform', !Array.isArray(rp.recetaV2.niveles['t4-n1']) && Array.isArray(rp.recetaV2.niveles['t4-n1'][0]));
  // --- parseRecetaPorApto: resolver hoja por ID de nivel (torres con letra) ---
  const towVic = [{ id:'va', name:'TORRE A', levels:[{ id:'va-n2', name:'NIVEL 2', aptos:[{id:'va-n2-a1', name:'Apartamento 201'},{id:'va-n2-a2', name:'Pasillos'}] }] }];
  const sheetsVic = { 'va-n2': [ ['ETAPA','MATERIAL','UNIDAD','Apartamento 201','Pasillos','TOTAL'], ['1RA ETAPA','CANAL DE 2 ½" X 10\' (0.35) CAL. 26','U', 19, 0, 19] ] };
  const rpVic = t.api.parseRecetaPorApto(sheetsVic, towVic);
  t.ok('vic.byid', !!rpVic.recetaV2.niveles['va-n2']);
  eq('vic.qty', (rpVic.recetaV2.niveles['va-n2'][0][0].aptos||{})['va-n2-a1'], 19);
  // --- RESUMEN PR ---
  const _prAoa = [
    ['RESUMEN PR','','','','','',''],
    ['DESCRIPCIÓN','MONTO CON IVA','FECHA FACTURA','FECHA PAGO','NO. FACTURA','ESTADO','TIPO'],
    ['ANTICIPO',2437425.46,'02/02/2026','02/02/2026','657080367','PAGADO','ANTICIPO'],
    ['ESTIMACIÓN #1',189986.77,'02/02/2026','13/02/2026','1305890722','PAGADO',''],
    ['ESTIMACIÓN #9','Q325,000.00','08/05/2026','16/05/2026','577916391','PAGADO','SIN AMORT'],
    ['ESTIMACIÓN #12',696654.69,'','','','PENDIENTE',''],
    ['','','','','','','']
  ];
  const _pr = t.api.parseResumenPR(_prAoa);
  eq('pr.count', _pr.rows.length, 4);
  eq('pr.antic', _pr.rows[0].isAnticipo, true);
  eq('pr.monto', _pr.rows[1].vp_ci, 189986.77);
  eq('pr.montoStrip', _pr.rows[2].vp_ci, 325000);
  eq('pr.noAmort', _pr.rows[2].noAmort, true);
  eq('pr.pagado', _pr.rows[1].sc, 'PAGADO');
  eq('pr.pend', _pr.rows[3].sc, 'PENDIENTE');
  eq('pr.factura', _pr.rows[0].factura, '657080367');
  eq('pr.fSerial', t.api._resumenFecha(25569), '01/01/1970');
  eq('pr.fISO', t.api._resumenFecha('2026-02-02'), '02/02/2026');
  eq('pr.fDMY', t.api._resumenFecha('2/2/2026'), '02/02/2026');
  const _prT = t.api.parseResumenPR([
    ['DESCRIPCIÓN','MONTO CON IVA','ESTADO'],
    ['ANTICIPO',100,'PAGADO'],
    ['TOTAL',999,''],
    ['LÍQUIDO A RECIBIR',888,''],
    ['SUBTOTAL',777,''],
    ['ESTIMACIÓN #1',50,'PENDIENTE']
  ]);
  const _prMin = t.api.parseResumenPR([
    ['DESCRIPCIÓN','MONTO CON IVA','FECHA PRESENTACIÓN'],
    ['ANTICIPO',1000,'01/06/2026'],
    ['ESTIMACIÓN #1',500,'15/06/2026']
  ]);
  eq('pr.minCount', _prMin.rows.length, 2);
  eq('pr.minF', _prMin.rows[1].f, '15/06/2026');
  eq('pr.minAntic', _prMin.rows[0].isAnticipo, true);
  eq('pr.minNoSc', _prMin.rows[1].sc, undefined);
  eq('pr.minNoId', _prMin.rows[1].id, undefined);
  eq('pr.skipTotales', _prT.rows.length, 2);
  const _avTw = [{ id:'t4', name:'TORRE 4', levels:[
    { id:'t4n1', name:'NIVEL 1', aptos:[{id:'a101',name:'APARTAMENTO 101'},{id:'aCine',name:'CINE'},{id:'aPas',name:'PASILLO'}] }
  ]}];
  const _avSheets = { 'ESTIMACIÓN': [
    [],[],[],[],[],[],[],
    ['','','','% EJECUTADO A LA FECHA'],
    ['','TORRE 4','',0.9],
    ['','NIVEL 1','',0.93],
    ['','Apartamento 101','',1],
    ['','Cine','',0.5],
    ['','Pasillo','',0.75]
  ]};
  const _av = t.api.parseAvanceExcel(_avSheets, _avTw);
  eq('av.101', _av.avance['a101'], 100);
  eq('av.cine', _av.avance['aCine'], 50);
  eq('av.pas', _av.avance['aPas'], 75);
  // AVANCE PR (pestaña estándar, header "% AVANCE")
  const _avPR = t.api.parseAvanceExcel({ 'AVANCE PR': [
    ['NOMBRE','% AVANCE'],
    ['TORRE 4', 0.9],
    ['NIVEL 1', 0.93],
    ['Apartamento 101', 1],
    ['Cine', 0.5]
  ]}, _avTw);
  eq('avpr.101', _avPR.avance['a101'], 100);
  eq('avpr.cine', _avPR.avance['aCine'], 50);
};
