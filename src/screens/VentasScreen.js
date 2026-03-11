import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import StatCard from '../components/StatCard';
import { api } from '../api/client';
import { COLORS, SPACING, RADIUS, SHADOW } from '../theme';
import { format, subDays, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const fmt$ = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;

const PERIODOS = [
  { key: 'hoy',    label: 'Hoy',       dias: 0 },
  { key: 'semana', label: '7 Días',    dias: 7 },
  { key: 'mes',    label: 'Este Mes',  dias: -1 },
  { key: '30',     label: '30 Días',   dias: 30 },
];

const AGRUPACIONES = [
  { key: 'hora',   label: 'Hora' },
  { key: 'dia',    label: 'Día' },
  { key: 'semana', label: 'Semana' },
];

const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.info, COLORS.warning, COLORS.danger, '#9B59B6'];

export default function VentasScreen() {
  const [periodo,    setPeriodo]    = useState('semana');
  const [agrupar,    setAgrupar]    = useState('dia');
  const [data,       setData]       = useState(null);
  const [grafica,    setGrafica]    = useState([]);
  const [tiposPago,  setTiposPago]  = useState([]);
  const [empleados,  setEmpleados]  = useState([]);
  const [filtros,    setFiltros]    = useState({ tipoPago: '', dining: '', empleado: '' });
  const [loading,    setLoading]    = useState(true);
  const [refresh,    setRefresh]    = useState(false);

  const rango = useCallback(() => {
    const hasta = new Date();
    let desde;
    if (periodo === 'hoy') {
      desde = new Date(); desde.setHours(0, 0, 0, 0);
    } else if (periodo === 'mes') {
      desde = startOfMonth(new Date());
    } else {
      const dias = PERIODOS.find(p => p.key === periodo)?.dias || 7;
      desde = subDays(new Date(), dias);
    }
    return { desde: desde.toISOString(), hasta: hasta.toISOString() };
  }, [periodo]);

  const cargar = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefresh(true) : setLoading(true);
    const { desde, hasta } = rango();
    try {
      const [ventasRes, grafRes] = await Promise.all([
        api.ventas({ desde, hasta, ...filtros }),
        api.graficaVentas({ desde, hasta, agrupar }),
      ]);
      setData(ventasRes.data);
      setGrafica(grafRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, [periodo, agrupar, filtros, rango]);

  useEffect(() => {
    api.tiposPago().then(r => setTiposPago(r.data || [])).catch(() => {});
    api.empleados().then(r => setEmpleados(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const barData = grafica.map(d => ({
    value: Math.round(d.total || 0),
    label: d.fecha?.length > 5 ? d.fecha.slice(-5) : d.fecha,
    frontColor: COLORS.primary,
  }));

  // Pie chart para canales de venta
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => cargar(true)} colors={[COLORS.primary]} />}
    >
      {/* Header período */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ventas</Text>
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
      </View>

      <View style={styles.body}>
        {/* KPIs */}
        <View style={styles.row}>
          <StatCard titulo="Total" valor={fmt$(resumen?.total)} icono="cash" color={COLORS.success} />
          <View style={{ width: SPACING.sm }} />
          <StatCard titulo="Pedidos" valor={resumen?.pedidos || 0} icono="receipt" color={COLORS.primary} />
          <View style={{ width: SPACING.sm }} />
          <StatCard titulo="Ticket" valor={fmt$(resumen?.ticketPromedio)} icono="trending-up" color={COLORS.info} />
        </View>

        {/* Agrupar gráfica */}
        <View style={styles.row2}>
          <Text style={styles.seccion}>Gráfica</Text>
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
            <Text style={styles.seccion}>Por Canal</Text>
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
            <Text style={styles.seccion}>Top Productos</Text>
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
        <Text style={styles.seccion}>Filtros</Text>
        <View style={styles.card}>
          {/* Tipo de pago */}
          <Text style={styles.filtLabel}>Tipo de pago</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              <TouchableOpacity
                style={[styles.chip, styles.chipSm, !filtros.tipoPago && styles.chipActive]}
                onPress={() => setFiltros(f => ({ ...f, tipoPago: '' }))}
              >
                <Text style={[styles.chipTxt, !filtros.tipoPago && styles.chipTxtActive]}>Todos</Text>
              </TouchableOpacity>
              {tiposPago.map(tp => (
                <TouchableOpacity
                  key={tp.id}
                  style={[styles.chip, styles.chipSm, filtros.tipoPago === tp.id && styles.chipActive]}
                  onPress={() => setFiltros(f => ({ ...f, tipoPago: f.tipoPago === tp.id ? '' : tp.id }))}
                >
                  <Text style={[styles.chipTxt, filtros.tipoPago === tp.id && styles.chipTxtActive]}>
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
                    style={[styles.chip, styles.chipSm, !filtros.empleado && styles.chipActive]}
                    onPress={() => setFiltros(f => ({ ...f, empleado: '' }))}
                  >
                    <Text style={[styles.chipTxt, !filtros.empleado && styles.chipTxtActive]}>Todos</Text>
                  </TouchableOpacity>
                  {empleados.slice(0, 8).map(e => (
                    <TouchableOpacity
                      key={e.id}
                      style={[styles.chip, styles.chipSm, filtros.empleado === e.id && styles.chipActive]}
                      onPress={() => setFiltros(f => ({ ...f, empleado: f.empleado === e.id ? '' : e.id }))}
                    >
                      <Text style={[styles.chipTxt, filtros.empleado === e.id && styles.chipTxtActive]}>
                        {e.name?.split(' ')[0] || 'Sin nombre'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          <TouchableOpacity style={styles.aplicarBtn} onPress={() => cargar()}>
            <Text style={styles.aplicarTxt}>Aplicar filtros</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xl }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    paddingTop:    52,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.secondary,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: SPACING.sm },

  body:    { padding: SPACING.md },
  seccion: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm, marginTop: SPACING.md },
  row:     { flexDirection: 'row', alignItems: 'flex-start' },
  row2:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  chips: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  chip:  { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipSm: { paddingHorizontal: 10, paddingVertical: 4 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt:    { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  chipTxtActive: { color: '#FFF' },

  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.card },

  prodRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  prodBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  prodPos:   { fontSize: 12, fontWeight: '700' },
  prodNom:   { flex: 1, fontSize: 13, color: COLORS.text },
  prodCant:  { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  leyendaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  leyendaDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  leyendaTxt: { flex: 1, fontSize: 12, color: COLORS.text },
  leyendaVal: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },

  filtLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6, fontWeight: '500' },
  aplicarBtn: { marginTop: SPACING.md, backgroundColor: COLORS.primary, padding: SPACING.sm, borderRadius: RADIUS.full, alignItems: 'center' },
  aplicarTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
