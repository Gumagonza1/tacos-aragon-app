import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS, SPACING, RADIUS, SHADOW } from '../theme';

const USOS_CFDI = [
  { clave: 'G01', desc: 'Adquisición de mercancias' },
  { clave: 'G03', desc: 'Gastos en general' },
  { clave: 'D01', desc: 'Honorarios médicos' },
  { clave: 'S01', desc: 'Sin efectos fiscales' },
];

const REGIMENES = [
  { clave: '601', desc: 'General de Ley' },
  { clave: '612', desc: 'Personas Físicas con Actividades' },
  { clave: '616', desc: 'Sin obligaciones fiscales' },
  { clave: '626', desc: 'Simplificado de Confianza' },
];

export default function FacturarScreen() {
  const [paso,      setPaso]      = useState(1);   // 1: buscar ticket, 2: datos cliente, 3: confirmar
  const [numTicket, setNumTicket] = useState('');
  const [ticket,    setTicket]    = useState(null);
  const [cliente,   setCliente]   = useState({ rfc: '', nombre: '', email: '', codigoPostal: '', regimenFiscal: '616', usoCFDI: 'G03' });
  const [cargando,  setCargando]  = useState(false);
  const [factura,   setFactura]   = useState(null);

  const fmt$ = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  async function buscarTicket() {
    if (!numTicket.trim()) return;
    setCargando(true);
    try {
      const res = await api.ticketParaFactura(numTicket.trim());
      setTicket(res.data);
      setPaso(2);
    } catch {
      Alert.alert('Error', 'Ticket no encontrado. Verifica el número.');
    } finally {
      setCargando(false);
    }
  }

  const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

  async function buscarClienteFacturama() {
    if (!RFC_RE.test(cliente.rfc)) return;
    try {
      const res = await api.buscarClienteFacturama(cliente.rfc);
      if (res.data?.Rfc) {
        setCliente(c => ({
          ...c,
          nombre:       res.data.Name  || c.nombre,
          email:        res.data.Email || c.email,
          codigoPostal: res.data.TaxZipCode || c.codigoPostal,
          regimenFiscal: res.data.FiscalRegime || c.regimenFiscal,
        }));
      }
    } catch {}
  }

  async function timbrar() {
    if (!cliente.rfc || !cliente.nombre || !cliente.codigoPostal) {
      Alert.alert('Faltan datos', 'Completa RFC, nombre y código postal.');
      return;
    }
    if (!RFC_RE.test(cliente.rfc)) {
      Alert.alert('RFC inválido', 'El formato del RFC no es correcto (ej. XAXX010101000).');
      return;
    }
    setCargando(true);
    try {
      const res = await api.facturar({ ticket_datos: ticket, cliente });
      setFactura(res.data);
      setPaso(3);
    } catch (e) {
      console.error('[FacturarScreen/timbrar]', e.response?.data || e.message);
      Alert.alert('Error al facturar', 'No se pudo procesar la factura. Verifica los datos e intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  function reiniciar() {
    setPaso(1); setNumTicket(''); setTicket(null); setFactura(null);
    setCliente({ rfc: '', nombre: '', email: '', codigoPostal: '', regimenFiscal: '616', usoCFDI: 'G03' });
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Facturación</Text>
        <Text style={styles.headerSub}>Facturama PAC</Text>
      </View>

      {/* Pasos */}
      <View style={styles.pasos}>
        {['Ticket', 'Cliente', 'Listo'].map((p, i) => (
          <React.Fragment key={i}>
            <View style={[styles.paso, paso > i + 1 && styles.pasoHecho, paso === i + 1 && styles.pasoActivo]}>
              {paso > i + 1
                ? <Ionicons name="checkmark" size={14} color="#FFF" />
                : <Text style={[styles.pasoNum, paso === i + 1 && { color: '#FFF' }]}>{i + 1}</Text>
              }
            </View>
            {i < 2 && <View style={[styles.pasoline, paso > i + 1 && styles.pasolineHecha]} />}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* PASO 1: Buscar ticket */}
        {paso === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Buscar Ticket</Text>
            <Text style={styles.cardSub}>Ingresa el número del recibo de Loyverse</Text>
            <TextInput
              style={styles.input}
              value={numTicket}
              onChangeText={setNumTicket}
              placeholder="Ej. 1234"
              keyboardType="numeric"
              autoFocus
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={buscarTicket} disabled={cargando}>
              {cargando
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.primaryBtnTxt}>Buscar Ticket</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* PASO 2: Datos del cliente */}
        {paso === 2 && ticket && (
          <>
            {/* Resumen del ticket */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ticket #{ticket.receipt_number}</Text>
              {(ticket.line_items || []).map((li, i) => (
                <View key={i} style={styles.liRow}>
                  <Text style={styles.liNom} numberOfLines={1}>{li.item_name}</Text>
                  <Text style={styles.liPrecio}>{fmt$(li.total_money)}</Text>
                </View>
              ))}
              <View style={[styles.liRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, marginTop: 4 }]}>
                <Text style={{ fontWeight: '700', color: COLORS.text }}>Total</Text>
                <Text style={{ fontWeight: '700', color: COLORS.primary, fontSize: 16 }}>{fmt$(ticket.total_money)}</Text>
              </View>
            </View>

            {/* Datos del receptor */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Datos del Receptor</Text>

              <Text style={styles.inputLabel}>RFC *</Text>
              <TextInput
                style={styles.input}
                value={cliente.rfc}
                onChangeText={v => setCliente(c => ({ ...c, rfc: v.toUpperCase() }))}
                onBlur={buscarClienteFacturama}
                placeholder="XAXX010101000"
                autoCapitalize="characters"
                maxLength={13}
              />

              <Text style={styles.inputLabel}>Nombre / Razón Social *</Text>
              <TextInput
                style={styles.input}
                value={cliente.nombre}
                onChangeText={v => setCliente(c => ({ ...c, nombre: v }))}
                placeholder="Nombre completo o razón social"
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={cliente.email}
                onChangeText={v => setCliente(c => ({ ...c, email: v }))}
                placeholder="correo@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Código Postal *</Text>
              <TextInput
                style={styles.input}
                value={cliente.codigoPostal}
                onChangeText={v => setCliente(c => ({ ...c, codigoPostal: v }))}
                placeholder="80000"
                keyboardType="numeric"
                maxLength={5}
              />

              <Text style={styles.inputLabel}>Uso CFDI</Text>
              <View style={styles.chips}>
                {USOS_CFDI.map(u => (
                  <TouchableOpacity
                    key={u.clave}
                    style={[styles.chip, cliente.usoCFDI === u.clave && styles.chipActive]}
                    onPress={() => setCliente(c => ({ ...c, usoCFDI: u.clave }))}
                  >
                    <Text style={[styles.chipTxt, cliente.usoCFDI === u.clave && styles.chipTxtActive]}>
                      {u.clave}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputHint}>
                {USOS_CFDI.find(u => u.clave === cliente.usoCFDI)?.desc}
              </Text>

              <Text style={[styles.inputLabel, { marginTop: SPACING.sm }]}>Régimen Fiscal</Text>
              <View style={styles.chips}>
                {REGIMENES.map(r => (
                  <TouchableOpacity
                    key={r.clave}
                    style={[styles.chip, cliente.regimenFiscal === r.clave && styles.chipActive]}
                    onPress={() => setCliente(c => ({ ...c, regimenFiscal: r.clave }))}
                  >
                    <Text style={[styles.chipTxt, cliente.regimenFiscal === r.clave && styles.chipTxtActive]}>
                      {r.clave}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputHint}>
                {REGIMENES.find(r => r.clave === cliente.regimenFiscal)?.desc}
              </Text>
            </View>

            <View style={styles.botonesRow}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setPaso(1)}>
                <Text style={styles.secBtnTxt}>Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={timbrar} disabled={cargando}>
                {cargando
                  ? <ActivityIndicator color="#FFF" />
                  : <><Ionicons name="document-text" size={16} color="#FFF" /><Text style={styles.primaryBtnTxt}> Timbrar CFDI</Text></>
                }
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* PASO 3: Factura lista */}
        {paso === 3 && factura && (
          <View style={[styles.card, { alignItems: 'center' }]}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
            <Text style={styles.okTitle}>¡Factura Timbrada!</Text>
            <Text style={styles.okSub}>Folio Fiscal: {factura.CfdiId || factura.Id || '–'}</Text>
            <Text style={styles.okSub}>{factura.FileName || ''}</Text>

            <TouchableOpacity style={[styles.primaryBtn, { marginTop: SPACING.lg, width: '100%' }]} onPress={reiniciar}>
              <Text style={styles.primaryBtnTxt}>Nueva Factura</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 52, paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.secondary,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  headerSub:   { fontSize: 12, color: '#FFFFFF70' },

  pasos: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: SPACING.md, backgroundColor: COLORS.card,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  paso: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pasoActivo: { backgroundColor: COLORS.primary },
  pasoHecho:  { backgroundColor: COLORS.success },
  pasoNum:    { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  pasoline:   { flex: 1, height: 2, backgroundColor: COLORS.border, maxWidth: 60 },
  pasolineHecha: { backgroundColor: COLORS.success },

  body: { padding: SPACING.md },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.card },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardSub:   { fontSize: 13, color: COLORS.textMuted, marginBottom: SPACING.md },

  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginBottom: SPACING.sm, fontSize: 14, color: COLORS.text,
    backgroundColor: COLORS.bg,
  },
  inputLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500', marginBottom: 4 },
  inputHint:  { fontSize: 11, color: COLORS.textMuted, marginBottom: SPACING.sm },

  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  chipActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt:     { fontSize: 12, color: COLORS.text },
  chipTxtActive: { color: '#FFF', fontWeight: '600' },

  liRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  liNom:   { flex: 1, fontSize: 13, color: COLORS.text },
  liPrecio: { fontSize: 13, fontWeight: '600', color: COLORS.text },

  botonesRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  primaryBtn:  {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    padding: SPACING.md, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', ...SHADOW.strong,
  },
  primaryBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  secBtn: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full,
    padding: SPACING.md, paddingHorizontal: SPACING.lg, alignItems: 'center',
  },
  secBtnTxt: { color: COLORS.text, fontWeight: '600' },

  okTitle: { fontSize: 22, fontWeight: '700', color: COLORS.success, marginTop: SPACING.md },
  okSub:   { fontSize: 13, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
});
