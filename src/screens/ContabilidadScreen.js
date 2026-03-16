import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS, SPACING, RADIUS, SHADOW } from '../theme';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Catalogo de cuentas contables ────────────────────────────────────────────
// key   → se guarda en la BD y Claude lo interpreta como cuenta contable real
// label → lo que ve el usuario en la app
// cuenta → nombre contable (referencia SAT / plan de cuentas MX)
// ──────────────────────────────────────────────────────────────────────────────

const CUENTAS_INGRESO = [
  // ── Ingresos por venta (4001) — desglosados por metodo de cobro ────────────
  { key: 'ventas_efectivo',       label: 'Venta Efectivo',       cuenta: '4001 · Ingresos / Efectivo',       color: '#27AE60' },
  { key: 'ventas_transferencia',  label: 'Venta Transferencia',  cuenta: '4001 · Ingresos / Transferencia',  color: '#2980B9' },
  { key: 'ventas_tarjeta',        label: 'Venta Tarjeta',        cuenta: '4001 · Ingresos / Tarjeta',        color: '#8E44AD' },
  { key: 'ventas_link',           label: 'Venta Link de Pago',   cuenta: '4001 · Ingresos / Link/Online',    color: '#16A085' },
  // ── Entradas de efectivo / banco (no son ventas, son movimientos) ──────────
  { key: 'retiro_banco',          label: 'Retiro del Banco',     cuenta: '1102 · Mov. Banco → Efectivo',    color: '#D35400' },
  // ── Otros ingresos (4900) ─────────────────────────────────────────────────
  { key: 'otros_ingresos',        label: 'Otros Ingresos',       cuenta: '4900 · Ingresos Varios',           color: '#7F8C8D' },
];

const CUENTAS_GASTO = [
  // ── Costo de Ventas (5xxx) ──────────────────────────────────────────────────
  { key: 'costo_venta',           label: 'Materia Prima',        cuenta: '5001 · Costo de Ventas',           color: '#E74C3C', deducible: true },
  { key: 'empaque',               label: 'Empaque / Desechable', cuenta: '5101 · Material de Empaque',       color: '#C0392B', deducible: true },
  // ── Nomina (6001-6002) ─────────────────────────────────────────────────────
  { key: 'nomina',                label: 'Sueldos',              cuenta: '6001 · Nomina y Salarios',         color: '#8E44AD', deducible: true },
  { key: 'imss',                  label: 'IMSS / INFONAVIT',     cuenta: '6002 · Contrib. Sociales',         color: '#7D3C98', deducible: true },
  // ── Gastos Fijos (6101-6202) ───────────────────────────────────────────────
  { key: 'renta',                 label: 'Renta del Local',      cuenta: '6101 · Arrendamiento',             color: '#2C3E50', deducible: true },
  { key: 'luz_gas_agua',          label: 'Luz / Gas / Agua',     cuenta: '6201 · Servicios Publicos',        color: '#D35400', deducible: true },
  { key: 'tel_internet',          label: 'Tel / Internet',       cuenta: '6202 · Comunicaciones',            color: '#E67E22', deducible: true },
  // ── Gastos Operativos (6301-6601) ─────────────────────────────────────────
  { key: 'mantenimiento',         label: 'Mantenimiento',        cuenta: '6301 · Mant. y Reparaciones',      color: '#16A085', deducible: true },
  { key: 'transporte',            label: 'Gasolina / Flete',     cuenta: '6401 · Transportes',               color: '#1ABC9C', deducible: true },
  { key: 'publicidad',            label: 'Publicidad / Mkt',     cuenta: '6501 · Publicidad',                color: '#2980B9', deducible: true },
  { key: 'limpieza',              label: 'Limpieza / Higiene',   cuenta: '6601 · Art. de Limpieza',          color: '#27AE60', deducible: true },
  // ── Pagos a Proveedores (6xxx) ─────────────────────────────────────────────
  { key: 'pago_proveedor_ef',     label: 'Proveedor Efectivo',   cuenta: '6002 · Pago Proveedor / Efectivo', color: '#E74C3C', deducible: true },
  { key: 'pago_proveedor_tr',     label: 'Proveedor Transfer.',  cuenta: '6002 · Pago Proveedor / Transfer.',color: '#C0392B', deducible: true },
  { key: 'pago_proveedor_td',     label: 'Proveedor Tarjeta',    cuenta: '6002 · Pago Proveedor / Tarjeta',  color: '#A93226', deducible: true },
  // ── Gastos de Administracion (7xxx) ───────────────────────────────────────
  { key: 'honorarios',            label: 'Contador / Abogado',   cuenta: '7001 · Honorarios',                color: '#7F8C8D', deducible: true },
  { key: 'papeleria',             label: 'Papeleria / Utiles',   cuenta: '7101 · Papeleria',                 color: '#95A5A6', deducible: false },
  // ── Credito y Banco (movimientos de caja) ─────────────────────────────────
  { key: 'pago_credito',          label: 'Pago TDC Negocio',     cuenta: '2101 · Pago Tarjeta de Credito',   color: '#C0392B', deducible: false },
  { key: 'deposito_banco',        label: 'Deposito al Banco',    cuenta: '1102 · Mov. Efectivo → Banco',     color: '#1A5276', deducible: false },
  // ── Otros ─────────────────────────────────────────────────────────────────
  { key: 'otros_gastos',          label: 'Otros Gastos',         cuenta: '7900 · Gastos Varios',             color: '#BDC3C7', deducible: false },
];

const fmt$ = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;

// Mapa rápido de color por key (para MovimientoRow)
const COLOR_TIPO = Object.fromEntries([
  ...CUENTAS_INGRESO.map(c => [c.key, c.color]),
  ...CUENTAS_GASTO.map(c => [c.key, c.color]),
]);

export default function ContabilidadScreen() {
  const [tab,        setTab]        = useState('movimientos'); // 'movimientos' | 'analisis' | 'pendientes'
  const [subTab,     setSubTab]     = useState('ingresos');
  const [mes,        setMes]        = useState(new Date());
  const [ingresos,   setIngresos]   = useState([]);
  const [gastos,     setGastos]     = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [analisis,   setAnalisis]   = useState('');
  const [analLoading,setAnalLoading]= useState(false);
  const [modalOpen,  setModalOpen]  = useState(false); // 'ingreso' | 'gasto' | 'pendiente' | false
  const [cfoChat,    setCfoChat]    = useState('');
  const [chatResp,   setChatResp]   = useState('');
  const [chatLoad,   setChatLoad]   = useState(false);

  // Pendientes
  const [pendientes,     setPendientes]     = useState([]);
  const [pendienteIdx,   setPendienteIdx]   = useState(null);
  const [pendienteAcc,   setPendienteAcc]   = useState('ingreso'); // 'ingreso' | 'gasto' | 'ignorar'
  const [resolvLoading,  setResolvLoading]  = useState(false);

  // Formulario nuevo movimiento
  const [form, setForm] = useState({ concepto: '', tipo: CUENTAS_INGRESO[0].key, monto: '', notas: '', deducible: 1 });

  const desde = format(startOfMonth(mes), 'yyyy-MM-dd');
  const hasta  = format(endOfMonth(mes),   'yyyy-MM-dd');
  const mesLabel = format(mes, 'MMMM yyyy', { locale: es });

  useEffect(() => { cargar(); }, [mes]);
  useEffect(() => { cargarPendientes(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [ri, rg] = await Promise.all([
        api.ingresos(desde, hasta),
        api.gastos(desde, hasta),
      ]);
      setIngresos(ri.data || []);
      setGastos(rg.data || []);
    } catch {}
    setLoading(false);
  }

  async function cargarPendientes() {
    try {
      const r = await api.pendientesContabilidad();
      setPendientes(r.data || []);
    } catch {}
  }

  function abrirPendiente(idx) {
    const item = pendientes[idx];
    const esEntrada = item.tipo_movimiento === 'PAY_IN' || item.tipo_movimiento === 'INGRESO_PENDIENTE';
    setPendienteIdx(idx);
    setPendienteAcc(esEntrada ? 'ingreso' : 'gasto');
    setForm({
      concepto: item.comentario && item.comentario !== '—' ? item.comentario : '',
      tipo:     esEntrada ? CUENTAS_INGRESO[0].key : CUENTAS_GASTO[0].key,
      monto:    String(item.monto),
      notas:    '',
      deducible: esEntrada ? 0 : 1,
    });
    setModalOpen('pendiente');
  }

  async function resolverPendiente() {
    if (pendienteAcc !== 'ignorar' && !form.tipo) {
      Alert.alert('Falta la cuenta contable');
      return;
    }
    setResolvLoading(true);
    try {
      await api.resolverPendiente({
        idx:      pendienteIdx,
        accion:   pendienteAcc,
        tipo:     pendienteAcc !== 'ignorar' ? form.tipo : undefined,
        concepto: form.concepto || undefined,
        deducible: form.deducible,
      });
      setModalOpen(false);
      cargarPendientes();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || e.message);
    }
    setResolvLoading(false);
  }

  async function guardar() {
    if (!form.concepto || !form.tipo || !form.monto) {
      Alert.alert('Faltan datos', 'Llena concepto, tipo y monto.');
      return;
    }
    const monto = parseFloat(form.monto.replace(',', '.'));
    if (isNaN(monto) || monto <= 0) { Alert.alert('Monto invalido'); return; }

    try {
      const payload = { ...form, monto, fecha: format(new Date(), 'yyyy-MM-dd') };
      if (modalOpen === 'ingreso') {
        await api.crearIngreso(payload);
      } else {
        await api.crearGasto({ ...payload, deducible: form.deducible });
      }
      setModalOpen(false);
      setForm({ concepto: '', tipo: CUENTAS_INGRESO[0].key, monto: '', notas: '', deducible: 1 });
      cargar();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message);
    }
  }

  async function generarEstado() {
    setAnalLoading(true);
    setAnalisis('');
    try {
      const r = await api.estadoResultados(desde, hasta);
      setAnalisis(r.data.analisis);
    } catch (e) {
      setAnalisis('Error al generar el analisis.');
    }
    setAnalLoading(false);
  }

  async function generarBalance() {
    setAnalLoading(true);
    setAnalisis('');
    try {
      const r = await api.balanceGeneral(desde, hasta);
      setAnalisis(r.data.analisis);
    } catch (e) {
      setAnalisis('Error al generar el balance.');
    }
    setAnalLoading(false);
  }

  async function preguntarCfo() {
    if (!cfoChat.trim()) return;
    setChatLoad(true);
    try {
      const r = await api.cfoChat(cfoChat, mesLabel);
      setChatResp(r.data.respuesta);
    } catch { setChatResp('Error al conectar.'); }
    setChatLoad(false);
  }

  const totalIngresos = ingresos.reduce((s, i) => s + i.monto, 0);
  const totalGastos   = gastos.reduce((s, g) => s + g.monto, 0);
  const utilidad      = totalIngresos - totalGastos;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>CFO ARAGON</Text>
          <Text style={styles.headerTitle}>Contabilidad</Text>
        </View>
        <View style={styles.headerMes}>
          <TouchableOpacity onPress={() => setMes(d => subMonths(d, 1))}>
            <Ionicons name="chevron-back" size={18} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerMesTxt}>{format(mes, 'MMM yy', { locale: es })}</Text>
          <TouchableOpacity onPress={() => setMes(d => subMonths(d, -1))}>
            <Ionicons name="chevron-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* KPIs rapidos */}
      <View style={styles.kpiRow}>
        <KpiBox label="Ingresos" monto={totalIngresos} color={COLORS.success} />
        <KpiBox label="Gastos"   monto={totalGastos}   color={COLORS.danger}  />
        <KpiBox label="Utilidad" monto={utilidad}       color={utilidad >= 0 ? COLORS.success : COLORS.danger} />
      </View>

      {/* Tabs principales */}
      <View style={styles.tabRow}>
        {[['movimientos','Movimientos'],['analisis','Análisis'],['pendientes','Pendientes']].map(([k,l]) => (
          <TouchableOpacity key={k} style={[styles.tab, tab===k && styles.tabActive]} onPress={() => { setTab(k); if (k==='pendientes') cargarPendientes(); }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.tabTxt, tab===k && styles.tabTxtActive]}>{l}</Text>
              {k === 'pendientes' && pendientes.length > 0 && (
                <View style={styles.badge}><Text style={styles.badgeTxt}>{pendientes.length}</Text></View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'pendientes' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
          {pendientes.length === 0
            ? <Text style={styles.emptyTxt}>Sin movimientos pendientes de catalogar.</Text>
            : pendientes.map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.pendRow} onPress={() => abrirPendiente(idx)}>
                  <View style={[styles.pendIcon, { backgroundColor: item.tipo_movimiento === 'PAY_OUT' ? '#FDE8E8' : '#E8F5E9' }]}>
                    <Ionicons
                      name={item.tipo_movimiento === 'PAY_OUT' ? 'arrow-down' : 'arrow-up'}
                      size={16}
                      color={item.tipo_movimiento === 'PAY_OUT' ? COLORS.danger : COLORS.success}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendConcepto}>{item.comentario || '—'}</Text>
                    <Text style={styles.pendMeta}>{item.fecha} · {item.hora} · {item.tipo_movimiento}</Text>
                  </View>
                  <Text style={[styles.pendMonto, { color: item.tipo_movimiento === 'PAY_OUT' ? COLORS.danger : COLORS.success }]}>
                    {item.tipo_movimiento === 'PAY_OUT' ? '-' : '+'}${item.monto?.toLocaleString('es-MX')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))
          }
          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      ) : tab === 'movimientos' ? (
        <>
          {/* Sub-tabs Ingresos/Gastos */}
          <View style={styles.subTabRow}>
            {[['ingresos','Ingresos'],['gastos','Gastos']].map(([k,l]) => (
              <TouchableOpacity key={k} style={[styles.subTab, subTab===k && styles.subTabActive]} onPress={() => setSubTab(k)}>
                <Text style={[styles.subTabTxt, subTab===k && styles.subTabTxtActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addBtn}
              onPress={() => {
                const esIngreso = subTab === 'ingresos';
                setModalOpen(esIngreso ? 'ingreso' : 'gasto');
                setForm({ concepto:'', tipo: esIngreso ? CUENTAS_INGRESO[0].key : CUENTAS_GASTO[0].key, monto:'', notas:'', deducible: esIngreso ? 0 : 1 });
              }}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
            {loading
              ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
              : (subTab === 'ingresos' ? ingresos : gastos).map(item => (
                  <MovimientoRow key={item.id} item={item} tipo={subTab}
                    onDelete={async () => {
                      subTab === 'ingresos' ? await api.eliminarIngreso(item.id) : await api.eliminarGasto(item.id);
                      cargar();
                    }} />
                ))
            }
            {!loading && (subTab === 'ingresos' ? ingresos : gastos).length === 0 && (
              <Text style={styles.emptyTxt}>Sin {subTab} en {mesLabel}. Toca + para agregar.</Text>
            )}
            <View style={{ height: SPACING.xl }} />
          </ScrollView>
        </>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
          <View style={styles.botonesAnalisis}>
            <TouchableOpacity style={styles.btnAnalisis} onPress={generarEstado} disabled={analLoading}>
              <Ionicons name="bar-chart" size={16} color="#FFF" />
              <Text style={styles.btnAnalisisTxt}>Estado de Resultados</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnAnalisis, { backgroundColor: COLORS.secondary }]} onPress={generarBalance} disabled={analLoading}>
              <Ionicons name="scale" size={16} color="#FFF" />
              <Text style={styles.btnAnalisisTxt}>Balance General</Text>
            </TouchableOpacity>
          </View>

          {analLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.loadingTxt}>Claude analizando...</Text>
            </View>
          )}

          {analisis ? (
            <View style={styles.card}>
              <Text style={styles.analisisTxt}>{analisis}</Text>
            </View>
          ) : null}

          {/* Chat CFO */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Preguntale al CFO</Text>
            <TextInput
              style={styles.chatInput}
              value={cfoChat}
              onChangeText={setCfoChat}
              placeholder="Ej: cuanto gaste en materia prima?"
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
            <TouchableOpacity style={styles.chatBtn} onPress={preguntarCfo} disabled={chatLoad}>
              {chatLoad ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.chatBtnTxt}>Enviar</Text>}
            </TouchableOpacity>
            {chatResp ? <Text style={styles.chatResp}>{chatResp}</Text> : null}
          </View>

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      )}

      {/* Modal catalogar pendiente */}
      <Modal transparent animationType="slide" visible={modalOpen === 'pendiente'} onRequestClose={() => setModalOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalBox}>
                {pendienteIdx !== null && pendientes[pendienteIdx] && (() => {
                  const item = pendientes[pendienteIdx];
                  const cuentas = pendienteAcc === 'ingreso' ? CUENTAS_INGRESO : CUENTAS_GASTO;
                  return (
                    <>
                      <Text style={styles.modalTitle}>Catalogar movimiento</Text>

                      {/* Info del movimiento */}
                      <View style={styles.pendInfoBox}>
                        <Text style={styles.pendInfoTxt}>{item.tipo_movimiento}  ·  {item.hora}  ·  {item.fecha}</Text>
                        <Text style={styles.pendInfoMonto}>${item.monto?.toLocaleString('es-MX')}</Text>
                        {item.razon ? <Text style={styles.pendInfoRazon} numberOfLines={2}>{item.razon}</Text> : null}
                      </View>

                      {/* Seleccionar acción */}
                      <Text style={styles.formLabel}>¿Qué es este movimiento?</Text>
                      <View style={styles.accionRow}>
                        {[['ingreso','Ingreso','arrow-up','#27AE60'],['gasto','Gasto','arrow-down','#E74C3C'],['ignorar','Ignorar','close-circle','#7F8C8D']].map(([a,l,ic,col]) => (
                          <TouchableOpacity key={a} style={[styles.accionChip, pendienteAcc===a && { backgroundColor: col, borderColor: col }]}
                            onPress={() => {
                              setPendienteAcc(a);
                              setForm(f => ({ ...f, tipo: a==='ingreso' ? CUENTAS_INGRESO[0].key : CUENTAS_GASTO[0].key }));
                            }}>
                            <Ionicons name={ic} size={14} color={pendienteAcc===a ? '#FFF' : col} />
                            <Text style={[styles.accionTxt, pendienteAcc===a && { color: '#FFF' }]}>{l}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {pendienteAcc !== 'ignorar' && (
                        <>
                          <Text style={styles.formLabel}>Concepto (opcional)</Text>
                          <TextInput style={styles.formInput} value={form.concepto}
                            onChangeText={v => setForm(f => ({ ...f, concepto: v }))}
                            placeholder={item.comentario || 'Descripción'} placeholderTextColor={COLORS.textMuted} />

                          <Text style={styles.formLabel}>Cuenta contable</Text>
                          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                            <View style={styles.cuentasGrid}>
                              {cuentas.map(c => (
                                <TouchableOpacity key={c.key}
                                  style={[styles.cuentaChip, form.tipo === c.key && { backgroundColor: c.color, borderColor: c.color }]}
                                  onPress={() => setForm(f => ({ ...f, tipo: c.key, deducible: c.deducible ? 1 : 0 }))}>
                                  <Text style={[styles.cuentaLabel, form.tipo === c.key && { color: '#FFF' }]}>{c.label}</Text>
                                  <Text style={[styles.cuentaCuenta, form.tipo === c.key && { color: '#FFFFFFCC' }]} numberOfLines={1}>{c.cuenta}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </ScrollView>

                          {pendienteAcc === 'gasto' && (
                            <TouchableOpacity style={styles.deducibleRow} onPress={() => setForm(f => ({ ...f, deducible: f.deducible ? 0 : 1 }))}>
                              <Ionicons name={form.deducible ? 'checkbox' : 'square-outline'} size={20} color={COLORS.primary} />
                              <Text style={styles.deducibleTxt}>Gasto deducible de impuestos</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}

                      <View style={styles.modalBtns}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                          <Text style={styles.cancelBtnTxt}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.guardarBtn, resolvLoading && { opacity: 0.6 }]}
                          onPress={resolverPendiente} disabled={resolvLoading}>
                          {resolvLoading
                            ? <ActivityIndicator color="#FFF" size="small" />
                            : <Text style={styles.guardarBtnTxt}>{pendienteAcc === 'ignorar' ? 'Ignorar' : 'Guardar'}</Text>
                          }
                        </TouchableOpacity>
                      </View>
                    </>
                  );
                })()}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal agregar movimiento */}
      <Modal transparent animationType="slide" visible={!!modalOpen && modalOpen !== 'pendiente'} onRequestClose={() => setModalOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Nuevo {modalOpen === 'ingreso' ? 'Ingreso' : 'Gasto'}</Text>

                <Text style={styles.formLabel}>Concepto</Text>
                <TextInput style={styles.formInput} value={form.concepto}
                  onChangeText={v => setForm(f => ({...f, concepto: v}))}
                  placeholder="Ej: Ventas del dia" placeholderTextColor={COLORS.textMuted} />

                <Text style={styles.formLabel}>Cuenta contable</Text>
                <View style={styles.cuentasGrid}>
                  {(modalOpen === 'ingreso' ? CUENTAS_INGRESO : CUENTAS_GASTO).map(c => (
                    <TouchableOpacity key={c.key}
                      style={[styles.cuentaChip, form.tipo === c.key && { backgroundColor: c.color, borderColor: c.color }]}
                      onPress={() => setForm(f => ({ ...f, tipo: c.key, deducible: c.deducible ? 1 : 0 }))}>
                      <Text style={[styles.cuentaLabel, form.tipo === c.key && { color: '#FFF' }]}>{c.label}</Text>
                      <Text style={[styles.cuentaCuenta, form.tipo === c.key && { color: '#FFFFFFCC' }]} numberOfLines={1}>{c.cuenta}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.formLabel}>Monto ($)</Text>
                <TextInput style={styles.formInput} value={form.monto}
                  onChangeText={v => setForm(f => ({...f, monto: v}))}
                  keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={COLORS.textMuted} />

                {modalOpen === 'gasto' && (
                  <TouchableOpacity style={styles.deducibleRow} onPress={() => setForm(f => ({...f, deducible: f.deducible ? 0 : 1}))}>
                    <Ionicons name={form.deducible ? 'checkbox' : 'square-outline'} size={20} color={COLORS.primary} />
                    <Text style={styles.deducibleTxt}>Gasto deducible de impuestos</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.formLabel}>Notas (opcional)</Text>
                <TextInput style={[styles.formInput, { height: 60 }]} value={form.notas}
                  onChangeText={v => setForm(f => ({...f, notas: v}))}
                  multiline placeholder="..." placeholderTextColor={COLORS.textMuted} />

                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                    <Text style={styles.cancelBtnTxt}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.guardarBtn} onPress={guardar}>
                    <Text style={styles.guardarBtnTxt}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

function KpiBox({ label, monto, color }) {
  return (
    <View style={[kpiStyles.box, { borderTopColor: color }]}>
      <Text style={kpiStyles.label}>{label}</Text>
      <Text style={[kpiStyles.monto, { color }]}>{`$${Math.abs(monto).toLocaleString('es-MX',{minimumFractionDigits:0})}`}</Text>
    </View>
  );
}

function MovimientoRow({ item, tipo, onDelete }) {
  return (
    <View style={movStyles.row}>
      <View style={[movStyles.dot, { backgroundColor: (COLOR_TIPO[item.tipo] || COLORS.textMuted) + '30' }]}>
        <Ionicons name={tipo === 'ingresos' ? 'arrow-up' : 'arrow-down'} size={14}
          color={tipo === 'ingresos' ? COLORS.success : COLORS.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={movStyles.concepto}>{item.concepto}</Text>
        <Text style={movStyles.meta}>
          {item.fecha} · {[...CUENTAS_INGRESO, ...CUENTAS_GASTO].find(c => c.key === item.tipo)?.label || item.tipo}
        </Text>
      </View>
      <Text style={[movStyles.monto, { color: tipo === 'ingresos' ? COLORS.success : COLORS.danger }]}>
        {tipo === 'ingresos' ? '+' : '-'}${item.monto.toLocaleString('es-MX',{minimumFractionDigits:0})}
      </Text>
      <TouchableOpacity onPress={() =>
        Alert.alert('Eliminar', `Eliminar "${item.concepto}"?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: onDelete },
        ])
      } style={{ marginLeft: 8 }}>
        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  box:   { flex: 1, backgroundColor: '#FFF', borderRadius: RADIUS.sm, padding: SPACING.sm, borderTopWidth: 3, alignItems: 'center', margin: 2 },
  label: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  monto: { fontSize: 14, fontWeight: '800', marginTop: 2 },
});

const movStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: SPACING.sm, borderRadius: RADIUS.sm, marginBottom: 4, ...SHADOW.card },
  dot:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  concepto: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  meta:     { fontSize: 11, color: COLORS.textMuted },
  monto:    { fontSize: 14, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 52, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.secondary,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  headerSub:    { fontSize: 10, fontWeight: '700', color: COLORS.primary, letterSpacing: 1.5 },
  headerTitle:  { fontSize: 24, fontWeight: '800', color: '#FFF' },
  headerMes:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerMesTxt: { fontSize: 13, color: '#FFF', fontWeight: '700', textTransform: 'capitalize' },

  kpiRow: { flexDirection: 'row', backgroundColor: '#FFF', padding: SPACING.sm, gap: 4 },

  tabRow:    { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:       { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabTxt:    { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  tabTxtActive: { color: COLORS.primary },

  subTabRow: { flexDirection: 'row', backgroundColor: COLORS.bg, padding: SPACING.xs, gap: 4, alignItems: 'center' },
  subTab:    { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm, backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.border },
  subTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  subTabTxt: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  subTabTxtActive: { color: '#FFF' },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  body: { padding: SPACING.sm },
  card: { backgroundColor: '#FFF', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.card },
  cardLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  botonesAnalisis: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  btnAnalisis: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, padding: SPACING.sm, borderRadius: RADIUS.full },
  btnAnalisisTxt: { color: '#FFF', fontWeight: '700', fontSize: 12 },

  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.md },
  loadingTxt: { color: COLORS.textMuted, fontSize: 13 },
  analisisTxt: { fontSize: 13, color: COLORS.text, lineHeight: 20 },

  chatInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.sm, minHeight: 50, textAlignVertical: 'top', fontSize: 13, color: COLORS.text, marginBottom: SPACING.sm },
  chatBtn: { backgroundColor: COLORS.secondary, padding: SPACING.sm, borderRadius: RADIUS.full, alignItems: 'center' },
  chatBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  chatResp: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.text, lineHeight: 20 },

  emptyTxt: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40, fontSize: 13 },

  chips: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { fontSize: 12, color: COLORS.text },
  chipTxtActive: { color: '#FFF', fontWeight: '700' },

  cuentasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4, marginTop: 2 },
  cuentaChip: {
    width: '47%', paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  cuentaLabel:  { fontSize: 13, fontWeight: '700', color: COLORS.text },
  cuentaCuenta: { fontSize: 9,  fontWeight: '500', color: COLORS.textMuted, marginTop: 1 },

  badge: { backgroundColor: COLORS.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeTxt: { color: '#FFF', fontSize: 9, fontWeight: '800' },

  pendRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: SPACING.sm, borderRadius: RADIUS.sm, marginBottom: 4, ...SHADOW.card },
  pendIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  pendConcepto: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  pendMeta:     { fontSize: 11, color: COLORS.textMuted },
  pendMonto:    { fontSize: 14, fontWeight: '700' },

  pendInfoBox:   { backgroundColor: COLORS.bg, borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.sm },
  pendInfoTxt:   { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  pendInfoMonto: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  pendInfoRazon: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, lineHeight: 16 },

  accionRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.sm },
  accionChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFF' },
  accionTxt:  { fontSize: 12, fontWeight: '700', color: COLORS.text },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  formLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: SPACING.sm },
  formInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.sm, fontSize: 14, color: COLORS.text },
  deducibleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.sm },
  deducibleTxt: { fontSize: 13, color: COLORS.text },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: { flex: 1, padding: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnTxt: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  guardarBtn: { flex: 1, padding: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, alignItems: 'center' },
  guardarBtnTxt: { fontSize: 14, color: '#FFF', fontWeight: '700' },
});
