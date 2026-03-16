import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS, SPACING, RADIUS, SHADOW } from '../theme';

export default function MonitorScreen() {
  const [estado,     setEstado]     = useState(null);
  const [alertas,    setAlertas]    = useState([]);
  const [texto,      setTexto]      = useState('');
  const [cargando,   setCargando]   = useState(true);
  const [enviando,   setEnviando]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [eRes, aRes] = await Promise.all([
        api.monitorEstado(),
        api.monitorAlertas(),
      ]);
      setEstado(eRes.data);
      setAlertas(aRes.data.alertas || []);
    } catch (e) {
      console.warn('Monitor:', e.message);
    } finally {
      setCargando(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function enviarComando(textoCmd, id) {
    setEnviando(true);
    try {
      await api.monitorComando(textoCmd, id);
      setTexto('');
      setTimeout(cargar, 2000); // dar tiempo al monitor para procesar
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function responderAlerta(alerta, respuesta) {
    await enviarComando(respuesta, alerta.id);
  }

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Ionicons name="eye" size={20} color="#FFF" />
          <Text style={styles.headerTitle}>Monitor de Calidad</Text>
          <View style={[styles.badge, { backgroundColor: estado?.pendientes > 0 ? COLORS.danger : COLORS.success }]}>
            <Text style={styles.badgeTxt}>{estado?.pendientes ?? 0}</Text>
          </View>
        </View>
        <Text style={styles.headerSub}>claude-sonnet-4-6 · tiempo real</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />}
      >
        {/* Estado general */}
        {estado && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado</Text>
            <View style={styles.statsGrid}>
              <Stat label="Conversaciones" value={estado.conversacionesVigiladas} icon="people" />
              <Stat label="Alertas"         value={estado.alertasPendientes}       icon="warning"   color={estado.alertasPendientes > 0 ? COLORS.danger : COLORS.success} />
              <Stat label="Propuestas"      value={estado.propuestasPendientes}    icon="build"     color={estado.propuestasPendientes > 0 ? COLORS.warning : COLORS.success} />
              <Stat label="Sin enviar"      value={estado.mensajesSinEnviar}       icon="time"      color={estado.mensajesSinEnviar > 0 ? COLORS.warning : COLORS.success} />
            </View>
          </View>
        )}

        {/* Comandos rápidos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comandos rápidos</Text>
          <View style={styles.cmdRow}>
            {['reporte', 'estado', 'propuestas'].map(cmd => (
              <TouchableOpacity
                key={cmd}
                style={styles.cmdBtn}
                onPress={() => enviarComando(cmd)}
                disabled={enviando}
              >
                <Text style={styles.cmdTxt}>{cmd}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Alertas y propuestas pendientes */}
        {alertas.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pendientes ({alertas.length})</Text>
            {alertas.map((alerta, i) => (
              <AlertaCard
                key={alerta.id ?? i}
                alerta={alerta}
                onAceptar={() => responderAlerta(alerta, 'si')}
                onRechazar={() => responderAlerta(alerta, 'no')}
                disabled={enviando}
              />
            ))}
          </View>
        )}

        {alertas.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={36} color={COLORS.success} />
            <Text style={styles.emptyTxt}>Sin alertas pendientes</Text>
          </View>
        )}

        {/* Chat libre */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mensaje al monitor</Text>
          <TextInput
            style={styles.input}
            value={texto}
            onChangeText={setTexto}
            placeholder="Pregunta o instrucción libre…"
            placeholderTextColor={COLORS.textMuted}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!texto.trim() || enviando) && styles.sendBtnDisabled]}
            onPress={() => enviarComando(texto.trim())}
            disabled={!texto.trim() || enviando}
          >
            {enviando
              ? <ActivityIndicator size="small" color="#FFF" />
              : <><Ionicons name="send" size={15} color="#FFF" /><Text style={styles.sendTxt}> Enviar</Text></>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, icon, color }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={18} color={color || COLORS.secondary} />
      <Text style={[styles.statVal, color && { color }]}>{value ?? '—'}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

function AlertaCard({ alerta, onAceptar, onRechazar, disabled }) {
  const isAlerta    = alerta.tipo === 'alerta';
  const color       = isAlerta ? COLORS.danger : COLORS.warning;
  const icono       = isAlerta ? 'warning' : 'build';
  const problema    = alerta.datos?.problema?.problema || alerta.datos?.descripcion || '';
  const sugerencia  = alerta.datos?.problema?.sugerencia || alerta.datos?.reemplazar || '';
  const archivo     = alerta.datos?.archivo || alerta.datos?.telefono || '';

  return (
    <View style={[styles.alertaCard, { borderLeftColor: color }]}>
      <View style={styles.alertaHeader}>
        <Ionicons name={icono} size={14} color={color} />
        <Text style={[styles.alertaId, { color }]}>[{alerta.id}] {isAlerta ? 'Alerta' : 'Propuesta'}</Text>
        {!!archivo && <Text style={styles.alertaArchivo}>{archivo}</Text>}
      </View>
      {!!problema   && <Text style={styles.alertaTxt}>{problema}</Text>}
      {!!sugerencia && <Text style={styles.alertaSug} numberOfLines={3}>{sugerencia}</Text>}
      <View style={styles.alertaBtns}>
        <TouchableOpacity style={[styles.alertaBtn, { backgroundColor: COLORS.success + '20', borderColor: COLORS.success }]}
          onPress={onAceptar} disabled={disabled}>
          <Ionicons name="checkmark" size={14} color={COLORS.success} />
          <Text style={[styles.alertaBtnTxt, { color: COLORS.success }]}>Aplicar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.alertaBtn, { backgroundColor: COLORS.danger + '15', borderColor: COLORS.danger }]}
          onPress={onRechazar} disabled={disabled}>
          <Ionicons name="close" size={14} color={COLORS.danger} />
          <Text style={[styles.alertaBtnTxt, { color: COLORS.danger }]}>Rechazar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:    { flex: 1 },

  header: {
    paddingTop: 52, paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.secondary,
  },
  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerTitle:{ fontSize: 20, fontWeight: '700', color: '#FFF', flex: 1 },
  headerSub:  { fontSize: 11, color: '#FFFFFF70', marginTop: 2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTxt: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.card,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  statBox: {
    flex: 1, minWidth: '40%', alignItems: 'center',
    backgroundColor: COLORS.bg, borderRadius: RADIUS.sm,
    padding: SPACING.sm, gap: 2,
  },
  statVal: { fontSize: 22, fontWeight: '700', color: COLORS.secondary },
  statLbl: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  cmdRow: { flexDirection: 'row', gap: SPACING.sm },
  cmdBtn: {
    flex: 1, paddingVertical: SPACING.sm, alignItems: 'center',
    backgroundColor: COLORS.secondary + '12', borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.secondary + '30',
  },
  cmdTxt: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },

  emptyCard: {
    alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.lg, marginBottom: SPACING.sm, ...SHADOW.card,
  },
  emptyTxt: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },

  alertaCard: {
    borderLeftWidth: 3, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg, padding: SPACING.sm,
    marginBottom: SPACING.sm, gap: 4,
  },
  alertaHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertaId:     { fontSize: 11, fontWeight: '700', flex: 1 },
  alertaArchivo:{ fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace' },
  alertaTxt:    { fontSize: 12, color: COLORS.text, lineHeight: 17 },
  alertaSug:    { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', lineHeight: 16 },
  alertaBtns:   { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
  alertaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1,
  },
  alertaBtnTxt: { fontSize: 12, fontWeight: '700' },

  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    padding: SPACING.sm, fontSize: 13, color: COLORS.text,
    backgroundColor: COLORS.bg, minHeight: 72, textAlignVertical: 'top',
    marginBottom: SPACING.sm,
  },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.secondary, borderRadius: RADIUS.full,
    padding: SPACING.sm,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendTxt: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
