import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import StatCard from '../components/StatCard';
import { api } from '../api/client';
import { COLORS, SPACING, RADIUS, SHADOW } from '../theme';
import { format, subDays, startOfMonth, addDays, subMonths, addMonths, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const fmt$ = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
const fmtFecha = d => format(d, 'd MMM', { locale: es });
const fmtFechaLarga = d => format(d, 'dd/MM/yyyy', { locale: es });

const PERIODOS = [
  { key: 'hoy',    label: 'Hoy' },
  { key: 'ayer',   label: 'Ayer' },
  { key: 'semana', label: '7 Días' },
  { key: 'mes',    label: 'Este Mes' },
  { key: '30',     label: '30 Días' },
  { key: 'dia',    label: 'Día' },
  { key: 'rango',  label: 'Rango' },
];

const AGRUPACIONES = [
  { key: 'hora',   label: 'Hora' },
  { key: 'dia',    label: 'Día' },
  { key: 'semana', label: 'Semana' },
];

const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.info, COLORS.warning, COLORS.danger, '#9B59B6'];

// ─── Mini date picker modal ────────────────────────────────────────────────────
function DatePickerModal({ visible, title, date, onConfirm, onClose }) {
  const [current, setCurrent] = useState(date || new Date());

  useEffect(() => { if (visible) setCurrent(date || new Date()); }, [visible]);

  const changeDay   = delta => setCurrent(d => addDays(d, delta));
  const changeMonth = delta => setCurrent(d => delta > 0 ? addMonths(d, 1) : subMonths(d, 1));

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={dpStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={dpStyles.box}>
              <Text style={dpStyles.title}>{title}</Text>

              {/* Month navigation */}
              <View style={dpStyles.row}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={dpStyles.arrow}>
                  <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={dpStyles.mesLabel}>{format(current, 'MMMM yyyy', { locale: es })}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={dpStyles.arrow}>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Day navigation */}
              <View style={dpStyles.row}>
                <TouchableOpacity onPress={() => changeDay(-1)} style={dpStyles.dayArrow}>
                  <Ionicons name="remove-circle-outline" size={30} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={dpStyles.dayBox}>
                  <Text style={dpStyles.dayNum}>{format(current, 'd')}</Text>
                  <Text style={dpStyles.dayNom}>{format(current, 'EEEE', { locale: es })}</Text>
                </View>
                <TouchableOpacity onPress={() => changeDay(1)} style={dpStyles.dayArrow}>
                  <Ionicons name="add-circle-outline" size={30} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <View style={dpStyles.btnRow}>
                <TouchableOpacity style={dpStyles.btnCancel} onPress={onClose}>
                  <Text style={dpStyles.btnCancelTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={dpStyles.btnOk} onPress={() => { onConfirm(current); onClose(); }}>
                  <Text style={dpStyles.btnOkTxt}>Aceptar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function VentasScreen() {
  const [periodo,    setPeriodo]    = useState('semana');
  const [agrupar,    setAgrupar]    = useState('dia');
  const [data,       setData]       = useState(null);
  const [grafica,    setGrafica]    = useState([]);
  const [tiposPago,  setTiposPago]  = useState([]);
  const [empleados,  setEmpleados]  = useState([]);
  const [filtros,    setFiltros]    = useState({ tipo_pago: '', dining: '', employee_id: '' });
  const [loading,    setLoading]    = useState(true);
  const [refresh,    setRefresh]    = useState(false);

  // Date state for custom periods
  const [fechaDia,   setFechaDia]   = useState(new Date());
  const [fechaDesde, setFechaDesde] = useState(subDays(new Date(), 7));
  const [fechaHasta, setFechaHasta] = useState(new Date());
  const [modalOpen,  setModalOpen]  = useState(null); // 'dia' | 'desde' | 'hasta' | null

  // Refs to always have latest state (avoids stale closure on filter apply)
  const filtrosRef    = useRef(filtros);
  const periodoRef    = useRef(periodo);
  const agruparRef    = useRef(agrupar);
  const fechaDiaRef   = useRef(fechaDia);
  const fechaDesdeRef = useRef(fechaDesde);
  const fechaHastaRef = useRef(fechaHasta);

  useEffect(() => { filtrosRef.current  = filtros;   }, [filtros]);
  useEffect(() => { periodoRef.current  = periodo;   }, [periodo]);
  useEffect(() => { agruparRef.current  = agrupar;   }, [agrupar]);
  useEffect(() => { fechaDiaRef.current = fechaDia;  }, [fechaDia]);
  useEffect(() => { fechaDesdeRef.current = fechaDesde; }, [fechaDesde]);
  useEffect(() => { fechaHastaRef.current = fechaHasta; }, [fechaHasta]);

  const getRango = () => {
    const per   = periodoRef.current;
    const ahora = new Date();
    let desde, hasta;
    switch (per) {
      case 'hoy':
        desde = startOfDay(ahora); hasta = ahora; break;
      case 'ayer': {
        const ayer = subDays(ahora, 1);
        desde = startOfDay(ayer); hasta = endOfDay(ayer); break;
      }
      case 'semana':
        desde = subDays(ahora, 7); hasta = ahora; break;
      case 'mes':
        desde = startOfMonth(ahora); hasta = ahora; break;
      case '30':
        desde = subDays(ahora, 30); hasta = ahora; break;
      case 'dia':
        desde = startOfDay(fechaDiaRef.current); hasta = endOfDay(fechaDiaRef.current); break;
      case 'rango':
        desde = startOfDay(fechaDesdeRef.current); hasta = endOfDay(fechaHastaRef.current); break;
      default:
        desde = subDays(ahora, 7); hasta = ahora;
    }
    return { desde: desde.toISOString(), hasta: hasta.toISOString() };
  };

  // cargar always reads from refs — no stale closure possible
  const cargar = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefresh(true) : setLoading(true);
    const { desde, hasta } = getRango();
    const f = filtrosRef.current;
    // Only send non-empty filter params
    const params = { desde, hasta };
    if (f.tipo_pago)   params.tipo_pago   = f.tipo_pago;
    if (f.dining)      params.dining      = f.dining;
    if (f.employee_id) params.employee_id = f.employee_id;
    try {
      const [ventasRes, grafRes] = await Promise.all([
        api.ventas(params),
        api.graficaVentas({ desde, hasta, agrupar: agruparRef.current }),
      ]);
      setData(ventasRes.data);
      setGrafica(grafRes.data || []);
    } catch (e) {
      console.error('[VentasScreen]', e?.response?.data || e.message);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []); // no deps needed — reads from refs

  useEffect(() => {
    api.tiposPago().then(r => setTiposPago(r.data || [])).catch(() => {});
    api.empleados().then(r => setEmpleados(r.data || [])).catch(() => {});
  }, []);

  // Reload when period, grouping, or date selections change
  useEffect(() => { cargar(); }, [periodo, agrupar, fechaDia, fechaDesde, fechaHasta]);

  const barData = grafica.map(d => ({
    value: Math.round(d.total || 0),
    label: d.fecha?.length > 5 ? d.fecha.slice(-5) : d.fecha,
    frontColor: COLORS.primary,
  }));

  const canalData = Object.entries(data?.resumen?.porCanal || {}).map(([c, v], i) => ({
    value: v,
    color: PIE_COLORS[i % PIE_COLORS.length],
    text: c.slice(0, 8),
  }));

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
  );

  const { resumen } = data || {};

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => cargar(true)} colors={[COLORS.primary]} />}
      >
        {/* Header con gradiente */}
        <LinearGradient colors={[COLORS.secondary, '#0f1923']} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerSub}>PANEL DE VENTAS</Text>
              <Text style={styles.headerTitle}>Ventas</Text>
            </View>
            <View style={styles.headerIcon}>
              <Ionicons name="bar-chart" size={22} color={COLORS.primary} />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              {PERIODOS.map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.chip, periodo === p.key && styles.chipActive]}
                  onPress={() => setPeriodo(p.key)}
                >
                  <Text style={[styles.chipTxt, periodo === p.key && styles.chipTxtActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Date selectors for custom periods */}
          {periodo === 'dia' && (
            <TouchableOpacity style={styles.dateBtn} onPress={() => setModalOpen('dia')}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
              <Text style={styles.dateBtnTxt}>{fmtFechaLarga(fechaDia)}</Text>
            </TouchableOpacity>
          )}
          {periodo === 'rango' && (
            <View style={styles.rangoRow}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setModalOpen('desde')}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                <Text style={styles.dateBtnTxt}>Desde: {fmtFecha(fechaDesde)}</Text>
              </TouchableOpacity>
              <Text style={{ color: '#FFFFFF60', marginHorizontal: 6 }}>–</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setModalOpen('hasta')}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                <Text style={styles.dateBtnTxt}>Hasta: {fmtFecha(fechaHasta)}</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>

        <View style={styles.body}>
          {/* KPIs */}
          <View style={styles.row}>
            <StatCard titulo="Total" valor={fmt$(resumen?.total)} icono="cash" color={COLORS.success} />
            <View style={{ width: SPACING.sm }} />
            <StatCard titulo="Pedidos" valor={resumen?.pedidos || 0} icono="receipt" color={COLORS.primary} />
            <View style={{ width: SPACING.sm }} />
            <StatCard titulo="Ticket" valor={fmt$(resumen?.ticketPromedio)} icono="trending-up" color={COLORS.info} />
          </View>
          {data?.total != null && (
            <Text style={styles.totalRecibos}>
              {data.total} recibo{data.total !== 1 ? 's' : ''} encontrado{data.total !== 1 ? 's' : ''}
              {(filtros.tipo_pago || filtros.employee_id || filtros.dining) ? ' · filtrado' : ''}
            </Text>
          )}

          {/* Agrupar gráfica */}
          <View style={styles.row2}>
            <View style={styles.seccionRow}>
              <Ionicons name="bar-chart-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.seccion}>Gráfica</Text>
            </View>
            <View style={styles.chips}>
              {AGRUPACIONES.map(a => (
                <TouchableOpacity
                  key={a.key}
                  style={[styles.chip, styles.chipSm, agrupar === a.key && styles.chipActive]}
                  onPress={() => setAgrupar(a.key)}
                >
                  <Text style={[styles.chipTxt, agrupar === a.key && styles.chipTxtActive]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {barData.length > 0 && (
            <View style={styles.card}>
              <BarChart
                data={barData}
                width={290}
                barWidth={Math.max(12, Math.min(30, 280 / barData.length - 6))}
                spacing={6}
                roundedTop
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 9 }}
                xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 8 }}
                noOfSections={4}
                barBorderRadius={3}
                maxValue={Math.max(...barData.map(d => d.value), 1) * 1.2}
              />
            </View>
          )}

          {/* Canal de venta */}
          {canalData.length > 0 && (
            <>
              <View style={styles.seccionRow}>
                <Ionicons name="pie-chart-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.seccion}>Por Canal</Text>
              </View>
              <View style={[styles.card, styles.row]}>
                <PieChart
                  data={canalData}
                  donut
                  radius={55}
                  innerRadius={35}
                  centerLabelComponent={() => (
                    <Text style={{ fontSize: 11, color: COLORS.textMuted, textAlign: 'center' }}>
                      {resumen?.pedidos || 0}{'\n'}pedidos
                    </Text>
                  )}
                />
                <View style={{ flex: 1, paddingLeft: SPACING.md, justifyContent: 'center' }}>
                  {canalData.map((c, i) => (
                    <View key={i} style={styles.leyendaRow}>
                      <View style={[styles.leyendaDot, { backgroundColor: c.color }]} />
                      <Text style={styles.leyendaTxt} numberOfLines={1}>{c.text}</Text>
                      <Text style={styles.leyendaVal}>{c.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Top productos */}
          {resumen?.topProductos?.length > 0 && (
            <>
              <View style={styles.seccionRow}>
                <Ionicons name="trophy-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.seccion}>Top Productos</Text>
              </View>
              <View style={styles.card}>
                {resumen.topProductos.map((p, i) => (
                  <View key={i} style={styles.prodRow}>
                    <View style={[styles.prodBadge, { backgroundColor: PIE_COLORS[i % PIE_COLORS.length] + '20' }]}>
                      <Text style={[styles.prodPos, { color: PIE_COLORS[i % PIE_COLORS.length] }]}>{i + 1}</Text>
                    </View>
                    <Text style={styles.prodNom} numberOfLines={1}>{p.nombre}</Text>
                    <Text style={styles.prodCant}>{p.cantidad} pzs</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Filtros */}
          <View style={styles.seccionRow}>
            <Ionicons name="options-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.seccion}>Filtros</Text>
          </View>
          <View style={styles.card}>
            {/* Tipo de pago */}
            <Text style={styles.filtLabel}>Tipo de pago</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chips}>
                <TouchableOpacity
                  style={[styles.chip, styles.chipSm, !filtros.tipo_pago && styles.chipActive]}
                  onPress={() => setFiltros(f => ({ ...f, tipo_pago: '' }))}
                >
                  <Text style={[styles.chipTxt, !filtros.tipo_pago && styles.chipTxtActive]}>Todos</Text>
                </TouchableOpacity>
                {tiposPago.map(tp => (
                  <TouchableOpacity
                    key={tp.id}
                    style={[styles.chip, styles.chipSm, filtros.tipo_pago === tp.id && styles.chipActive]}
                    onPress={() => setFiltros(f => ({ ...f, tipo_pago: f.tipo_pago === tp.id ? '' : tp.id }))}
                  >
                    <Text style={[styles.chipTxt, filtros.tipo_pago === tp.id && styles.chipTxtActive]}>
                      {tp.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Empleado */}
            {empleados.length > 0 && (
              <>
                <Text style={[styles.filtLabel, { marginTop: SPACING.sm }]}>Empleado</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chips}>
                    <TouchableOpacity
                      style={[styles.chip, styles.chipSm, !filtros.employee_id && styles.chipActive]}
                      onPress={() => setFiltros(f => ({ ...f, employee_id: '' }))}
                    >
                      <Text style={[styles.chipTxt, !filtros.employee_id && styles.chipTxtActive]}>Todos</Text>
                    </TouchableOpacity>
                    {empleados.slice(0, 8).map(e => (
                      <TouchableOpacity
                        key={e.id}
                        style={[styles.chip, styles.chipSm, filtros.employee_id === e.id && styles.chipActive]}
                        onPress={() => setFiltros(f => ({ ...f, employee_id: f.employee_id === e.id ? '' : e.id }))}
                      >
                        <Text style={[styles.chipTxt, filtros.employee_id === e.id && styles.chipTxtActive]}>
                          {e.name?.split(' ')[0] || 'Sin nombre'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <TouchableOpacity style={styles.aplicarBtn} onPress={() => cargar(true)}>
              <Ionicons name="search" size={16} color="#FFF" />
              <Text style={styles.aplicarTxt}>Aplicar filtros</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: SPACING.xl }} />
        </View>
      </ScrollView>

      {/* Date picker modals */}
      <DatePickerModal
        visible={modalOpen === 'dia'}
        title="Seleccionar día"
        date={fechaDia}
        onConfirm={d => { setFechaDia(d); }}
        onClose={() => setModalOpen(null)}
      />
      <DatePickerModal
        visible={modalOpen === 'desde'}
        title="Fecha desde"
        date={fechaDesde}
        onConfirm={d => { setFechaDesde(d); }}
        onClose={() => setModalOpen(null)}
      />
      <DatePickerModal
        visible={modalOpen === 'hasta'}
        title="Fecha hasta"
        date={fechaHasta}
        onConfirm={d => { setFechaHasta(d); }}
        onClose={() => setModalOpen(null)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    paddingTop:    52,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  headerSub:   { fontSize: 10, fontWeight: '700', color: COLORS.primary, letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center', justifyContent: 'center',
  },

  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: COLORS.primary + '50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  dateBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  rangoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },

  body:    { padding: SPACING.md },
  seccionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.md, marginBottom: SPACING.sm },
  seccion: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  row:     { flexDirection: 'row', alignItems: 'flex-start' },
  row2:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  chips: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  chip:  {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipSm: { paddingHorizontal: 10, paddingVertical: 5 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt:    { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  chipTxtActive: { color: '#FFF', fontWeight: '700' },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
    borderWidth: 1,
    borderColor: COLORS.border + '60',
  },

  prodRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  prodBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  prodPos:   { fontSize: 12, fontWeight: '800' },
  prodNom:   { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '500' },
  prodCant:  { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  leyendaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  leyendaDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  leyendaTxt: { flex: 1, fontSize: 12, color: COLORS.text },
  leyendaVal: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },

  totalRecibos: { fontSize: 12, color: COLORS.textMuted, textAlign: 'right', marginTop: 4, marginBottom: 2 },
  filtLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  aplicarBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  aplicarTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});

const dpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: 280,
    alignItems: 'center',
    gap: 16,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  arrow: { padding: 6 },
  mesLabel: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#1A1A2E', textTransform: 'capitalize' },
  dayArrow: { padding: 4 },
  dayBox: { alignItems: 'center', minWidth: 80 },
  dayNum: { fontSize: 40, fontWeight: '700', color: COLORS.primary, lineHeight: 44 },
  dayNom: { fontSize: 13, color: '#666', textTransform: 'capitalize' },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btnCancel: { flex: 1, padding: 10, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  btnCancelTxt: { fontSize: 14, color: '#666', fontWeight: '600' },
  btnOk: { flex: 1, padding: 10, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, alignItems: 'center' },
  btnOkTxt: { fontSize: 14, color: '#FFF', fontWeight: '700' },
});
