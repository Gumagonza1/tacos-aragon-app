import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TouchableWithoutFeedback, TextInput, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { api, getCfoBase, getCfoToken } from '../api/client';
import { COLORS, SPACING, RADIUS, SHADOW } from '../theme';
import { format, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const TIPOS = [
  { key: 'recibidos', label: 'Recibidos' },
  { key: 'emitidos',  label: 'Emitidos' },
  { key: 'ambos',     label: 'Ambos' },
];

const LIMITE_PLATAFORMAS = 300_000;

function fmtMXN(n) {
  if (n == null) return '—';
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ImpuestosScreen() {
  const [mes,        setMes]        = useState(new Date());
  const [tipo,       setTipo]       = useState('recibidos');
  const [analizando, setAnalizando] = useState(false);
  const [resultado,  setResultado]  = useState(null);
  const [historial,  setHistorial]  = useState([]);
  const [chatOpen,   setChatOpen]   = useState(false);
  const [pregunta,   setPregunta]   = useState('');
  const [respuesta,  setRespuesta]  = useState('');
  const [chatLoading,setChatLoading]= useState(false);
  const [tab,        setTab]        = useState('analisis'); // 'analisis' | 'declarar' | 'historial'
  const [generandoXlsx,  setGenerandoXlsx]  = useState(false);
  const [subiendoXml,    setSubiendoXml]    = useState(false);
  const [manuales,       setManuales]       = useState([]);
  const [configModal,    setConfigModal]    = useState(false);
  const [credenciales,   setCredenciales]   = useState({ sat_rfc: '', sat_key_password: '', email_user: '', email_pass: '', imap_server: '' });
  const [guardandoCred,  setGuardandoCred]  = useState(false);

  // Nuevos estados — declaraciones, vencimientos, anual
  const [declaracion,   setDeclaracion]   = useState(null);
  const [vencimientos,  setVencimientos]  = useState([]);
  const [anual,         setAnual]         = useState(null);
  const [guardandoDecl, setGuardandoDecl] = useState(false);
  const [gastosRecurrentes, setGastosRecurrentes] = useState([]);

  // Estado del formulario de declaración
  const [declForm, setDeclForm] = useState({
    ingresos_plataformas: '',
    ingresos_propios: '',
    gastos_deducibles: '',
    nomina: '',
    isr_retenido: '',
    iva_retenido: '',
    iva_trasladado: '',
    iva_acreditable: '',
    notas: '',
  });

  // Modal de pago
  const [pagoModal,  setPagoModal]  = useState(null); // null | 'isr' | 'iva'
  const [pagoFecha,  setPagoFecha]  = useState('');
  const [pagoNumOp,  setPagoNumOp]  = useState('');
  const [guardandoPago, setGuardandoPago] = useState(false);

  const mesStr   = format(mes, 'yyyy-MM');
  const mesLabel = format(mes, 'MMMM yyyy', { locale: es });
  const anioActual = new Date().getFullYear();

  // ─── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    cargarHistorial();
    cargarVencimientos();
    cargarAnual(anioActual);
  }, []);

  useEffect(() => {
    cargarUltimoResultado();
    cargarManuales();
    cargarDeclaracion();
    cargarGastosRecurrentes();
  }, [mesStr]);

  async function cargarUltimoResultado() {
    try {
      const r = await api.impuestosResultado(mesStr);
      if (r.data?.resultado) setResultado(r.data.resultado);
    } catch {}
  }

  async function cargarHistorial() {
    try {
      const r = await api.impuestosHistorial();
      setHistorial(r.data || []);
    } catch {}
  }

  async function cargarVencimientos() {
    try {
      const r = await api.impuestosVencimientos();
      setVencimientos(r.data || []);
    } catch {}
  }

  async function cargarAnual(anio) {
    try {
      const r = await api.impuestosAnual(anio);
      setAnual(r.data);
    } catch {}
  }

  async function cargarDeclaracion() {
    try {
      const r = await api.impuestosDeclaracion(mesStr);
      setDeclaracion(r.data);
      // Pre-cargar formulario con datos existentes
      if (r.data) {
        setDeclForm({
          ingresos_plataformas: String(r.data.ingresos_plataformas || ''),
          ingresos_propios:     String(r.data.ingresos_propios || ''),
          gastos_deducibles:    String(r.data.gastos_deducibles || ''),
          nomina:               String(r.data.nomina || ''),
          isr_retenido:         String(r.data.isr_retenido || ''),
          iva_retenido:         String(r.data.iva_retenido || ''),
          iva_trasladado:       String(r.data.iva_trasladado || ''),
          iva_acreditable:      String(r.data.iva_acreditable || ''),
          notas:                r.data.notas || '',
        });
      }
    } catch {}
  }

  async function cargarGastosRecurrentes() {
    try {
      const r = await api.impuestosGastosRecurrentes(mesStr);
      setGastosRecurrentes(r.data || []);
    } catch {}
  }

  // ─── Análisis SAT ───────────────────────────────────────────────────────────
  async function analizar() {
    setAnalizando(true);
    setResultado(null);
    try {
      const r = await api.impuestosAnalizar(mesStr, tipo);
      setResultado(r.data);
      cargarHistorial();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message || 'Error al analizar');
    } finally {
      setAnalizando(false);
    }
  }

  async function cargarManuales() {
    try {
      const r = await api.impuestosListarManuales(mesStr);
      setManuales(r.data?.archivos || []);
    } catch {}
  }

  async function subirXmls() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/xml', 'application/xml', 'application/zip',
             'application/x-zip-compressed', '*/*'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    setSubiendoXml(true);
    try {
      const r = await api.impuestosSubirXml(mesStr, result.assets);
      Alert.alert('Listo', `${r.data.total} archivo(s) guardado(s) para ${mesStr}`);
      cargarManuales();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message || 'Error al subir');
    } finally {
      setSubiendoXml(false);
    }
  }

  async function eliminarManual(filename) {
    try {
      await api.impuestosEliminarManual(mesStr, filename);
      setManuales(prev => prev.filter(f => f !== filename));
    } catch (e) {
      Alert.alert('Error', 'No se pudo eliminar el archivo');
    }
  }

  async function abrirConfig() {
    try {
      const r = await api.configObtener();
      setCredenciales(r.data || {});
    } catch {}
    setConfigModal(true);
  }

  async function guardarCredenciales() {
    setGuardandoCred(true);
    try {
      const body = {};
      if (credenciales.sat_rfc)          body.sat_rfc          = credenciales.sat_rfc;
      if (credenciales.sat_key_password) body.sat_key_password = credenciales.sat_key_password;
      if (credenciales.email_user)       body.email_user       = credenciales.email_user;
      if (credenciales.email_pass)       body.email_pass       = credenciales.email_pass;
      if (credenciales.imap_server)      body.imap_server      = credenciales.imap_server;
      const r = await api.configActualizar(body);
      Alert.alert('Guardado', `Actualizado: ${r.data.actualizado.join(', ')}`);
      setConfigModal(false);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message || 'Error al guardar');
    } finally {
      setGuardandoCred(false);
    }
  }

  async function descargarExcel() {
    setGenerandoXlsx(true);
    try {
      const r = await api.impuestosExportarXlsx(mesStr, tipo);
      const url = `${getCfoBase()}/api/impuestos/descargar/${r.data.nombre}?token=${getCfoToken()}`;
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message || 'Error al generar Excel');
    } finally {
      setGenerandoXlsx(false);
    }
  }

  async function enviarChat() {
    if (!pregunta.trim()) return;
    setChatLoading(true);
    try {
      const r = await api.impuestosChat(pregunta, mesStr);
      setRespuesta(r.data.respuesta);
    } catch (e) {
      setRespuesta('Error al conectar con el agente.');
    } finally {
      setChatLoading(false);
    }
  }

  // ─── Declaración mensual ────────────────────────────────────────────────────
  async function guardarDeclaracion() {
    setGuardandoDecl(true);
    try {
      const body = {
        mes: mesStr,
        ingresos_plataformas: parseFloat(declForm.ingresos_plataformas) || 0,
        ingresos_propios:     parseFloat(declForm.ingresos_propios) || 0,
        gastos_deducibles:    parseFloat(declForm.gastos_deducibles) || 0,
        nomina:               parseFloat(declForm.nomina) || 0,
        isr_retenido:         parseFloat(declForm.isr_retenido) || 0,
        iva_retenido:         parseFloat(declForm.iva_retenido) || 0,
        iva_trasladado:       parseFloat(declForm.iva_trasladado) || 0,
        iva_acreditable:      parseFloat(declForm.iva_acreditable) || 0,
        notas:                declForm.notas,
      };
      const r = await api.impuestosGuardarDeclaracion(body);
      setDeclaracion(r.data);
      cargarAnual(anioActual);
      cargarVencimientos();
      Alert.alert('Guardado', `ISR a pagar: ${fmtMXN(r.data.isr_a_pagar)}\nIVA a pagar: ${fmtMXN(r.data.iva_a_pagar)}`);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message || 'Error al guardar declaración');
    } finally {
      setGuardandoDecl(false);
    }
  }

  async function registrarPago() {
    if (!pagoFecha || !pagoNumOp) {
      Alert.alert('Faltan datos', 'Ingresa la fecha de pago y el número de operación');
      return;
    }
    setGuardandoPago(true);
    try {
      const r = await api.impuestosMarcarPagado(mesStr, {
        tipo: pagoModal,
        fecha_pago: pagoFecha,
        num_operacion: pagoNumOp,
      });
      setDeclaracion(prev => ({ ...prev, ...r.data }));
      cargarVencimientos();
      cargarAnual(anioActual);
      setPagoModal(null);
      setPagoFecha('');
      setPagoNumOp('');
      Alert.alert('Registrado', `${pagoModal.toUpperCase()} marcado como pagado`);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message || 'Error al registrar pago');
    } finally {
      setGuardandoPago(false);
    }
  }

  // ─── Helpers de render ──────────────────────────────────────────────────────
  function estadoBadge(estado) {
    const cfg = {
      pendiente:  { bg: '#FEF3C7', color: '#92400E', label: 'Pendiente' },
      pagado:     { bg: '#D1FAE5', color: '#065F46', label: 'Pagado' },
      a_favor:    { bg: '#DBEAFE', color: '#1E40AF', label: 'A favor' },
      sin_datos:  { bg: '#F3F4F6', color: '#6B7280', label: 'Sin datos' },
    };
    const c = cfg[estado] || cfg.sin_datos;
    return (
      <View style={[styles.badge, { backgroundColor: c.bg }]}>
        <Text style={[styles.badgeTxt, { color: c.color }]}>{c.label}</Text>
      </View>
    );
  }

  // ─── Card vencimientos ──────────────────────────────────────────────────────
  function CardVencimientos() {
    if (vencimientos.length === 0) return null;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="calendar-outline" size={16} color="#DC2626" />
          <Text style={styles.cardTitle}>Vencimientos Próximos</Text>
        </View>
        {vencimientos.map(v => (
          <View key={v.mes} style={styles.vencRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.vencMes}>{v.mes}</Text>
              <Text style={styles.vencFecha}>Vence: {v.fecha_vencimiento} · {v.dias_restantes}d</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.vencLabel}>ISR</Text>
                {estadoBadge(v.estado_isr)}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.vencLabel}>IVA</Text>
                {estadoBadge(v.estado_iva)}
              </View>
            </View>
            {v.urgente && (
              <View style={styles.urgenteDot} />
            )}
          </View>
        ))}
      </View>
    );
  }

  // ─── Widget anual ───────────────────────────────────────────────────────────
  function WidgetAnual() {
    if (!anual) return null;
    const pct = Math.min((anual.ingresos_plataformas / LIMITE_PLATAFORMAS) * 100, 100);
    const barColor = anual.alerta_limite ? '#DC2626' : pct > 60 ? '#F59E0B' : '#16A34A';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="bar-chart-outline" size={16} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Ingresos Plataformas {anual.anio}</Text>
        </View>
        <Text style={styles.anualMonto}>{fmtMXN(anual.ingresos_plataformas)}</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
        <View style={styles.barLabels}>
          <Text style={styles.barPct}>{pct.toFixed(1)}% del límite $300K</Text>
          <Text style={styles.barProy}>Proyección: {fmtMXN(anual.proyeccion_anual)}</Text>
        </View>
        {anual.alerta_limite && (
          <View style={styles.alertaBox}>
            <Ionicons name="warning-outline" size={14} color="#92400E" />
            <Text style={styles.alertaTxt}>Proyección supera $270K — riesgo de exceder $300K</Text>
          </View>
        )}
      </View>
    );
  }

  // ─── Tab Declarar ───────────────────────────────────────────────────────────
  function TabDeclarar() {
    return (
      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Declaración {mesLabel}</Text>
          </View>

          {/* Ingresos */}
          <Text style={styles.sectionLabel}>Ingresos del mes</Text>
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Plataformas (Didi/Uber/Rappi)</Text>
              <TextInput
                style={styles.fieldInput}
                value={declForm.ingresos_plataformas}
                onChangeText={v => setDeclForm(p => ({ ...p, ingresos_plataformas: v }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Ventas propias (mostrador)</Text>
              <TextInput
                style={styles.fieldInput}
                value={declForm.ingresos_propios}
                onChangeText={v => setDeclForm(p => ({ ...p, ingresos_propios: v }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          {/* Deducciones */}
          <Text style={[styles.sectionLabel, { marginTop: SPACING.sm }]}>Deducciones</Text>
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Gastos deducibles (con CFDI)</Text>
              <TextInput
                style={styles.fieldInput}
                value={declForm.gastos_deducibles}
                onChangeText={v => setDeclForm(p => ({ ...p, gastos_deducibles: v }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Nómina + IMSS</Text>
              <TextInput
                style={styles.fieldInput}
                value={declForm.nomina}
                onChangeText={v => setDeclForm(p => ({ ...p, nomina: v }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          {/* Retenciones de plataformas */}
          <Text style={[styles.sectionLabel, { marginTop: SPACING.sm }]}>Retenciones de plataformas</Text>
          <View style={styles.formRow2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>ISR retenido (2.1%)</Text>
              <TextInput
                style={styles.fieldInput}
                value={declForm.isr_retenido}
                onChangeText={v => setDeclForm(p => ({ ...p, isr_retenido: v }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>IVA retenido (8%)</Text>
              <TextInput
                style={styles.fieldInput}
                value={declForm.iva_retenido}
                onChangeText={v => setDeclForm(p => ({ ...p, iva_retenido: v }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          {/* IVA */}
          <Text style={[styles.sectionLabel, { marginTop: SPACING.sm }]}>IVA del mes</Text>
          <View style={styles.formRow2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>IVA trasladado (16% ventas)</Text>
              <TextInput
                style={styles.fieldInput}
                value={declForm.iva_trasladado}
                onChangeText={v => setDeclForm(p => ({ ...p, iva_trasladado: v }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>IVA acreditable (gastos)</Text>
              <TextInput
                style={styles.fieldInput}
                value={declForm.iva_acreditable}
                onChangeText={v => setDeclForm(p => ({ ...p, iva_acreditable: v }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <TextInput
            style={[styles.fieldInput, { marginTop: SPACING.sm, minHeight: 48, textAlignVertical: 'top' }]}
            value={declForm.notas}
            onChangeText={v => setDeclForm(p => ({ ...p, notas: v }))}
            placeholder="Notas opcionales..."
            placeholderTextColor={COLORS.textMuted}
            multiline
          />

          <TouchableOpacity
            style={styles.calcularBtn}
            onPress={guardarDeclaracion}
            disabled={guardandoDecl}
          >
            {guardandoDecl
              ? <ActivityIndicator color="#FFF" size="small" />
              : <>
                  <Ionicons name="calculator-outline" size={16} color="#FFF" />
                  <Text style={styles.calcularTxt}>Calcular y Guardar</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* Resultado de la declaración */}
        {declaracion && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success} />
              <Text style={styles.cardTitle}>Resultado — {declaracion.mes}</Text>
            </View>

            <View style={styles.declResultRow}>
              <View style={styles.declBox}>
                <Text style={styles.declBoxLabel}>ISR Provisional</Text>
                <Text style={styles.declBoxMonto}>{fmtMXN(declaracion.isr_a_pagar)}</Text>
                <Text style={styles.declBoxSub}>Tarifa: {fmtMXN(declaracion.isr_tarifa)}</Text>
                <Text style={styles.declBoxSub}>Retenido: {fmtMXN(declaracion.isr_retenido)}</Text>
                {estadoBadge(declaracion.estado_isr)}
                {declaracion.estado_isr !== 'pagado' && (
                  <TouchableOpacity style={styles.pagarBtn} onPress={() => { setPagoModal('isr'); setPagoFecha(''); setPagoNumOp(''); }}>
                    <Text style={styles.pagarBtnTxt}>Marcar Pagado</Text>
                  </TouchableOpacity>
                )}
                {declaracion.estado_isr === 'pagado' && declaracion.fecha_pago_isr && (
                  <Text style={styles.fechaPagoTxt}>Pagado: {declaracion.fecha_pago_isr}</Text>
                )}
              </View>
              <View style={styles.declBox}>
                <Text style={styles.declBoxLabel}>IVA Mensual</Text>
                <Text style={styles.declBoxMonto}>{fmtMXN(declaracion.iva_a_pagar)}</Text>
                <Text style={styles.declBoxSub}>Trasladado: {fmtMXN(declaracion.iva_trasladado)}</Text>
                <Text style={styles.declBoxSub}>Acreditable: {fmtMXN(declaracion.iva_acreditable)}</Text>
                {estadoBadge(declaracion.estado_iva)}
                {declaracion.estado_iva !== 'pagado' && (
                  <TouchableOpacity style={styles.pagarBtn} onPress={() => { setPagoModal('iva'); setPagoFecha(''); setPagoNumOp(''); }}>
                    <Text style={styles.pagarBtnTxt}>Marcar Pagado</Text>
                  </TouchableOpacity>
                )}
                {declaracion.estado_iva === 'pagado' && declaracion.fecha_pago_iva && (
                  <Text style={styles.fechaPagoTxt}>Pagado: {declaracion.fecha_pago_iva}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Gastos recurrentes sin CFDI este mes */}
        {gastosRecurrentes.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
              <Text style={styles.cardTitle}>Proveedores sin CFDI este mes</Text>
            </View>
            <Text style={[styles.cardLabel, { marginBottom: SPACING.sm }]}>
              Recurrentes en últimos 4 meses que no han facturado en {mesLabel}
            </Text>
            {gastosRecurrentes.map(g => (
              <View key={g.rfc} style={styles.recurrenteItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recurrenteNombre} numberOfLines={1}>{g.nombre}</Text>
                  <Text style={styles.recurrenteRfc}>{g.rfc} · {g.meses_visto}/4 meses</Text>
                </View>
                <Text style={styles.recurrenteMonto}>{fmtMXN(g.monto_promedio)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // ─── Render principal ───────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>AGENTE FISCAL</Text>
          <Text style={styles.headerTitle}>Impuestos SAT</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeTxt}>Gemini + Claude</Text>
          </View>
          <TouchableOpacity onPress={abrirConfig} style={{ padding: 6 }}>
            <Ionicons name="settings-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[['analisis','Analisis'],['declarar','Declarar'],['historial','Historial']].map(([k,l]) => (
          <TouchableOpacity key={k} style={[styles.tab, tab===k && styles.tabActive]} onPress={() => setTab(k)}>
            <Text style={[styles.tabTxt, tab===k && styles.tabTxtActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }}>
        {tab === 'analisis' ? (
          <View style={styles.body}>

            {/* Card vencimientos — siempre arriba */}
            <CardVencimientos />

            {/* Selector de mes */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Periodo</Text>
              <View style={styles.mesRow}>
                <TouchableOpacity onPress={() => setMes(d => subMonths(d, 1))} style={styles.mesBtn}>
                  <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.mesLabel}>{mesLabel}</Text>
                <TouchableOpacity onPress={() => setMes(d => addMonths(d, 1))} style={styles.mesBtn}>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.cardLabel, { marginTop: SPACING.sm }]}>Tipo de CFDI</Text>
              <View style={styles.chips}>
                {TIPOS.map(t => (
                  <TouchableOpacity key={t.key}
                    style={[styles.chip, tipo===t.key && styles.chipActive]}
                    onPress={() => setTipo(t.key)}>
                    <Text style={[styles.chipTxt, tipo===t.key && styles.chipTxtActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.analizarBtn} onPress={analizar} disabled={analizando}>
                {analizando
                  ? <ActivityIndicator color="#FFF" />
                  : <>
                      <Ionicons name="document-text" size={16} color="#FFF" />
                      <Text style={styles.analizarTxt}>Descargar SAT y Analizar</Text>
                    </>
                }
              </TouchableOpacity>
            </View>

            {/* Subir XMLs manualmente */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="cloud-upload-outline" size={16} color={COLORS.info} />
                <Text style={styles.cardTitle}>XMLs Manuales — {mesLabel}</Text>
              </View>
              <TouchableOpacity style={styles.uploadBtn} onPress={subirXmls} disabled={subiendoXml}>
                {subiendoXml
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <>
                      <Ionicons name="add-circle-outline" size={16} color="#FFF" />
                      <Text style={styles.uploadBtnTxt}>Subir XMLs o ZIPs</Text>
                    </>
                }
              </TouchableOpacity>
              {manuales.length > 0 && (
                <View style={{ marginTop: SPACING.sm }}>
                  <Text style={[styles.cardLabel, { marginBottom: 4 }]}>{manuales.length} archivo(s) en el servidor</Text>
                  {manuales.map(f => (
                    <View key={f} style={styles.manualItem}>
                      <Ionicons name="document-outline" size={14} color={COLORS.textMuted} />
                      <Text style={styles.manualName} numberOfLines={1}>{f}</Text>
                      <TouchableOpacity onPress={() => eliminarManual(f)}>
                        <Ionicons name="trash-outline" size={16} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {analizando && (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text style={styles.loadingTxt}>Gemini descargando CFDIs del SAT...</Text>
                <Text style={styles.loadingTxt2}>Claude analizando impuestos... (puede tomar 1-2 min)</Text>
              </View>
            )}

            {/* Resultado del analisis */}
            {resultado?.analisis_claude && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="analytics" size={16} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>Analisis Fiscal — Claude</Text>
                </View>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaTxt}>{resultado.mes} · {resultado.descarga?.total_cfdis || 0} CFDIs</Text>
                </View>
                <Text style={styles.analisisTxt}>{resultado.analisis_claude}</Text>
              </View>
            )}

            {resultado?.analisis_claude && (
              <TouchableOpacity style={styles.xlsxBtn} onPress={descargarExcel} disabled={generandoXlsx}>
                {generandoXlsx
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <>
                      <Ionicons name="download-outline" size={16} color="#FFF" />
                      <Text style={styles.xlsxBtnTxt}>Descargar Excel</Text>
                    </>
                }
              </TouchableOpacity>
            )}

            {resultado?.descarga?.reporte_descarga && (
              <View style={[styles.card, { backgroundColor: '#F0FFF4' }]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="cloud-download" size={16} color={COLORS.success} />
                  <Text style={[styles.cardTitle, { color: COLORS.success }]}>Descarga SAT</Text>
                </View>
                <Text style={[styles.analisisTxt, { color: '#166534' }]}>{resultado.descarga.reporte_descarga}</Text>
              </View>
            )}

            {/* Widget anual — debajo del Excel */}
            <WidgetAnual />

            {/* Chat fiscal */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="chatbubbles" size={16} color={COLORS.info} />
                <Text style={styles.cardTitle}>Preguntale a Claude</Text>
              </View>
              <TextInput
                style={styles.chatInput}
                value={pregunta}
                onChangeText={setPregunta}
                placeholder="Ej: cuanto IVA debo este mes?"
                multiline
                placeholderTextColor={COLORS.textMuted}
              />
              <TouchableOpacity style={styles.chatBtn} onPress={enviarChat} disabled={chatLoading}>
                {chatLoading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.chatBtnTxt}>Preguntar</Text>
                }
              </TouchableOpacity>
              {respuesta ? (
                <View style={styles.respuestaBox}>
                  <Text style={styles.respuestaTxt}>{respuesta}</Text>
                </View>
              ) : null}
            </View>

          </View>
        ) : tab === 'declarar' ? (
          <TabDeclarar />
        ) : (
          // Historial
          <View style={styles.body}>
            {historial.length === 0
              ? <Text style={styles.emptyTxt}>No hay analisis guardados.</Text>
              : historial.map(h => (
                  <TouchableOpacity key={h.id} style={styles.histItem}
                    onPress={async () => {
                      const r = await api.impuestosResultado(h.mes);
                      if (r.data?.resultado) { setResultado(r.data.resultado); setTab('analisis'); }
                    }}>
                    <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                    <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                      <Text style={styles.histMes}>{h.mes}</Text>
                      <Text style={styles.histTipo}>{h.tipo}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ))
            }
          </View>
        )}
        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      {/* Modal de credenciales */}
      <Modal visible={configModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setConfigModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Credenciales SAT y Gmail</Text>
          <Text style={styles.modalSub}>Los cambios se aplican de inmediato y se guardan en el servidor.</Text>

          <Text style={styles.credLabel}>RFC del contribuyente</Text>
          <TextInput style={styles.credInput} value={credenciales.sat_rfc}
            onChangeText={v => setCredenciales(p => ({ ...p, sat_rfc: v }))}
            placeholder="GOAG941101R17" autoCapitalize="characters" placeholderTextColor={COLORS.textMuted} />

          <Text style={styles.credLabel}>Contrasena de firma SAT (.key)</Text>
          <TextInput style={styles.credInput} value={credenciales.sat_key_password}
            onChangeText={v => setCredenciales(p => ({ ...p, sat_key_password: v }))}
            placeholder="Contrasena actual: ****" secureTextEntry placeholderTextColor={COLORS.textMuted} />

          <Text style={styles.credLabel}>Email Gmail (retenciones)</Text>
          <TextInput style={styles.credInput} value={credenciales.email_user}
            onChangeText={v => setCredenciales(p => ({ ...p, email_user: v }))}
            placeholder="tucorreo@gmail.com" keyboardType="email-address" autoCapitalize="none"
            placeholderTextColor={COLORS.textMuted} />

          <Text style={styles.credLabel}>Contrasena de app Gmail</Text>
          <TextInput style={styles.credInput} value={credenciales.email_pass}
            onChangeText={v => setCredenciales(p => ({ ...p, email_pass: v }))}
            placeholder="Contrasena actual: ****" secureTextEntry placeholderTextColor={COLORS.textMuted} />

          <TouchableOpacity style={styles.credSaveBtn} onPress={guardarCredenciales} disabled={guardandoCred}>
            {guardandoCred
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={styles.credSaveTxt}>Guardar credenciales</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal de pago */}
      <Modal visible={pagoModal !== null} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setPagoModal(null)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>
            Registrar pago de {pagoModal?.toUpperCase()} — {mesStr}
          </Text>
          <Text style={styles.credLabel}>Fecha de pago (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.credInput}
            value={pagoFecha}
            onChangeText={setPagoFecha}
            placeholder="2026-03-17"
            placeholderTextColor={COLORS.textMuted}
          />
          <Text style={styles.credLabel}>Número de operación SAT</Text>
          <TextInput
            style={styles.credInput}
            value={pagoNumOp}
            onChangeText={setPagoNumOp}
            placeholder="00000000000"
            placeholderTextColor={COLORS.textMuted}
          />
          <TouchableOpacity style={styles.credSaveBtn} onPress={registrarPago} disabled={guardandoPago}>
            {guardandoPago
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={styles.credSaveTxt}>Confirmar pago</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 52, paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: '#1A1A2E',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  headerSub:   { fontSize: 10, fontWeight: '700', color: COLORS.primary, letterSpacing: 1.5 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  headerBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary + '40' },
  headerBadgeTxt: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },

  tabRow: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabTxt: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  tabTxtActive: { color: COLORS.primary },

  body: { padding: SPACING.md },
  card: { backgroundColor: '#FFF', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.card },
  cardLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  mesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  mesBtn: { padding: 8 },
  mesLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },

  chips: { flexDirection: 'row', gap: 6, marginBottom: SPACING.md },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  chipTxtActive: { color: '#FFF', fontWeight: '700' },

  analizarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, padding: SPACING.sm + 2, borderRadius: RADIUS.full },
  analizarTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  loadingCard: { backgroundColor: '#FFF', borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm, ...SHADOW.card },
  loadingTxt: { fontSize: 13, color: COLORS.text, textAlign: 'center' },
  loadingTxt2: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },

  metaBadge: { backgroundColor: COLORS.primary + '10', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, alignSelf: 'flex-start', marginBottom: SPACING.sm },
  metaTxt: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  analisisTxt: { fontSize: 13, color: COLORS.text, lineHeight: 20 },

  chatInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.sm, fontSize: 13, color: COLORS.text, minHeight: 60, textAlignVertical: 'top', marginBottom: SPACING.sm },
  chatBtn: { backgroundColor: COLORS.info, padding: SPACING.sm, borderRadius: RADIUS.full, alignItems: 'center' },
  chatBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  respuestaBox: { marginTop: SPACING.sm, backgroundColor: COLORS.info + '10', padding: SPACING.sm, borderRadius: RADIUS.sm },
  respuestaTxt: { fontSize: 13, color: COLORS.text, lineHeight: 20 },

  histItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.xs, ...SHADOW.card },
  histMes: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  histTipo: { fontSize: 12, color: COLORS.textMuted },
  emptyTxt: { textAlign: 'center', color: COLORS.textMuted, marginTop: SPACING.xl },

  xlsxBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a', padding: SPACING.sm + 2, borderRadius: RADIUS.full, marginBottom: SPACING.sm },
  xlsxBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.info, padding: SPACING.sm + 2, borderRadius: RADIUS.full },
  uploadBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  manualItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  manualName: { flex: 1, fontSize: 12, color: COLORS.text },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  modalSub: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.md },
  credLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: SPACING.sm },
  credInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.sm, fontSize: 14, color: COLORS.text },
  credSaveBtn: { backgroundColor: COLORS.primary, padding: SPACING.sm + 2, borderRadius: RADIUS.full, alignItems: 'center', marginTop: SPACING.md },
  credSaveTxt: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // Vencimientos
  vencRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.border, position: 'relative' },
  vencMes: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  vencFecha: { fontSize: 11, color: COLORS.textMuted },
  vencLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  urgenteDot: { position: 'absolute', top: 8, left: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },

  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },

  // Widget anual
  anualMonto: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
  barBg: { height: 10, backgroundColor: COLORS.border, borderRadius: 5, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: '100%', borderRadius: 5 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barPct: { fontSize: 11, color: COLORS.textMuted },
  barProy: { fontSize: 11, color: COLORS.textMuted },
  alertaBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', padding: SPACING.xs, borderRadius: RADIUS.sm, marginTop: 4 },
  alertaTxt: { fontSize: 11, color: '#92400E', flex: 1 },

  // Declaración
  sectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  formRow: { marginBottom: SPACING.xs },
  formRow2: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.xs },
  fieldLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 3 },
  fieldInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.sm, fontSize: 14, color: COLORS.text },
  calcularBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, padding: SPACING.sm + 2, borderRadius: RADIUS.full, marginTop: SPACING.md },
  calcularTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  declResultRow: { flexDirection: 'row', gap: SPACING.sm },
  declBox: { flex: 1, backgroundColor: COLORS.bg, borderRadius: RADIUS.sm, padding: SPACING.sm, gap: 3 },
  declBoxLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  declBoxMonto: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  declBoxSub: { fontSize: 11, color: COLORS.textMuted },
  pagarBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, alignSelf: 'flex-start', marginTop: 4 },
  pagarBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 11 },
  fechaPagoTxt: { fontSize: 10, color: '#065F46', marginTop: 2 },

  // Gastos recurrentes
  recurrenteItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  recurrenteNombre: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  recurrenteRfc: { fontSize: 11, color: COLORS.textMuted },
  recurrenteMonto: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },
});
