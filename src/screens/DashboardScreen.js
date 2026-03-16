import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import StatCard from '../components/StatCard';
import { api } from '../api/client';
import { COLORS, SPACING, RADIUS, SHADOW, FONTS } from '../theme';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const fmt$ = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmt$D = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function DashboardScreen({ navigation }) {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [refresh,       setRefresh]       = useState(false);
  const [error,         setError]         = useState(null);
  const [leyendoEnVoz,  setLeyendoEnVoz]  = useState(false);

  const cargar = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefresh(true) : setLoading(true);
      setError(null);
      const res = await api.dashboard();
      setData(res.data);
    } catch (e) {
      setError(e.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useEffect(() => { cargar(); }, []);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadTxt}>Cargando datos...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline" size={48} color={COLORS.textMuted} />
      <Text style={styles.errorTxt}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => cargar()}>
        <Text style={styles.retryTxt}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );

  const leerResumenEnVoz = () => {
    if (!data) return;
    if (leyendoEnVoz) { Speech.stop(); setLeyendoEnVoz(false); return; }
    const { hoy: h, semana: s } = data;
    const top = h?.topProductos?.[0];
    const texto = [
      `Buenos días. Resumen de hoy:`,
      `Ventas: ${fmt$D(h?.total)}.`,
      `${h?.pedidos ?? 0} pedidos.`,
      `Ticket promedio: ${fmt$D(h?.ticketPromedio)}.`,
      top ? `El más vendido es ${top.nombre} con ${top.cantidad} piezas.` : '',
      `Esta semana llevamos ${fmt$D(s?.total)} en ${s?.pedidos ?? 0} pedidos.`,
    ].filter(Boolean).join(' ');
    setLeyendoEnVoz(true);
    Speech.speak(texto, {
      language: 'es-MX',
      rate: 0.9,
      onDone: () => setLeyendoEnVoz(false),
      onStopped: () => setLeyendoEnVoz(false),
      onError: () => setLeyendoEnVoz(false),
    });
  };

  const { hoy, semana, mes, graficas } = data || {};

  // Preparar datos de la gráfica de últimos 7 días
  const barData = (graficas?.semana || []).map(d => ({
    value: Math.round(d.total || 0),
    label: d.fecha?.slice(5) || '',
    frontColor: COLORS.primary,
  }));

  // Gráfica de horas hoy
  const lineData = (graficas?.horas || []).map(d => ({
    value: Math.round(d.total || 0),
    label: d.fecha || '',
    dataPointColor: COLORS.primary,
  }));

  const ahora    = new Date();
  const diasSem  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const saludoHora = ahora.getHours() < 12 ? 'Buenos días' : ahora.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => cargar(true)} colors={[COLORS.primary]} />}
    >
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <View>
          <Text style={styles.saludo}>{saludoHora} 👋</Text>
          <Text style={styles.fecha}>{format(ahora, "EEEE d 'de' MMMM", { locale: es })}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity onPress={leerResumenEnVoz} style={[styles.iaBadge, leyendoEnVoz && { backgroundColor: '#FFFFFF40' }]}>
            <Ionicons name={leyendoEnVoz ? 'stop-circle' : 'volume-high-outline'} size={16} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Agente')}>
            <View style={styles.iaBadge}>
              <Ionicons name="sparkles" size={16} color="#FFF" />
              <Text style={styles.iaTxt}>IA</Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* KPIs de hoy */}
        <Text style={styles.seccion}>Hoy</Text>
        <View style={styles.row}>
          <StatCard titulo="Ventas" valor={fmt$(hoy?.total)} icono="cash" color={COLORS.success} />
          <View style={{ width: SPACING.sm }} />
          <StatCard titulo="Pedidos" valor={hoy?.pedidos || 0} icono="receipt" color={COLORS.primary} />
          <View style={{ width: SPACING.sm }} />
          <StatCard titulo="Ticket Prom." valor={fmt$(hoy?.ticketPromedio)} icono="trending-up" color={COLORS.info} />
        </View>

        {/* Top productos hoy */}
        {hoy?.topProductos?.length > 0 && (
          <>
            <Text style={styles.seccion}>Top Productos Hoy</Text>
            <View style={styles.card}>
              {hoy.topProductos.slice(0, 5).map((p, i) => (
                <View key={i} style={styles.prodRow}>
                  <Text style={styles.prodPos}>{i + 1}</Text>
                  <Text style={styles.prodNom} numberOfLines={1}>{p.nombre}</Text>
                  <Text style={styles.prodCant}>{p.cantidad} pzs</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Gráfica últimos 7 días */}
        {barData.length > 0 && (
          <>
            <Text style={styles.seccion}>Ventas Últimos 7 Días</Text>
            <View style={[styles.card, { paddingRight: 0 }]}>
              <BarChart
                data={barData}
                width={280}
                barWidth={28}
                spacing={12}
                roundedTop
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 9 }}
                noOfSections={4}
                maxValue={Math.max(...barData.map(d => d.value), 1) * 1.2}
                barBorderRadius={4}
              />
            </View>
          </>
        )}

        {/* Gráfica por horas hoy */}
        {lineData.length > 0 && (
          <>
            <Text style={styles.seccion}>Ventas por Hora (Hoy)</Text>
            <View style={styles.card}>
              <LineChart
                data={lineData}
                width={280}
                height={120}
                color={COLORS.primary}
                thickness={2}
                dataPointsColor={COLORS.primaryDark}
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 9 }}
                curved
                areaChart
                startFillColor={COLORS.primary + '40'}
                endFillColor={COLORS.primary + '05'}
              />
            </View>
          </>
        )}

        {/* KPIs semana / mes */}
        <Text style={styles.seccion}>Resumen del Período</Text>
        <View style={styles.row}>
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.periodoLabel}>Esta Semana</Text>
            <Text style={[styles.periodoValor, { color: COLORS.primary }]}>{fmt$(semana?.total)}</Text>
            <Text style={styles.periodoSub}>{semana?.pedidos || 0} pedidos</Text>
          </View>
          <View style={{ width: SPACING.sm }} />
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.periodoLabel}>Este Mes</Text>
            <Text style={[styles.periodoValor, { color: COLORS.success }]}>{fmt$(mes?.total)}</Text>
            <Text style={styles.periodoSub}>{mes?.pedidos || 0} pedidos</Text>
          </View>
        </View>

        <View style={{ height: SPACING.xl }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  loadTxt: { color: COLORS.textMuted, marginTop: SPACING.sm },
  errorTxt: { color: COLORS.danger, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
  retryTxt: { color: '#FFF', fontWeight: '600' },

  header: {
    paddingTop:    56,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  saludo: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  fecha:  { fontSize: 13, color: '#FFFFFF99', marginTop: 2 },
  iaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF25',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  iaTxt: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  body: { padding: SPACING.md },
  seccion: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm, marginTop: SPACING.md },
  row: { flexDirection: 'row' },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },

  prodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  prodPos: { width: 22, fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  prodNom: { flex: 1, fontSize: 14, color: COLORS.text },
  prodCant: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

  periodoLabel: { fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  periodoValor: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  periodoSub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
