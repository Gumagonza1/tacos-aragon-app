import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { api, guardarConfig, cargarConfig } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, RADIUS, SHADOW } from '../theme';

// ─── Datos SSH del servidor (Tailscale) ───────────────────────────────────────
const SSH_INFO = {
  ip:        '100.107.123.29',
  usuario:   'gumaro_gonzalez',
  puerto:    22,
  get cmd()  { return `ssh ${this.usuario}@${this.ip}`; },
};

export default function ConfigScreen() {
  const [baseURL,   setBaseURL]   = useState('http://100.107.123.29:3001');
  const [token,     setToken]     = useState('');
  const [probando,  setProbando]  = useState(false);
  const [status,    setStatus]    = useState(null);
  const [sshTab,    setSshTab]    = useState('claude');  // 'claude' | 'tablet' | 'setup'

  useEffect(() => {
    AsyncStorage.getItem('api_base_url').then(v => v && setBaseURL(v));
    AsyncStorage.getItem('api_token').then(v => v && setToken(v));
  }, []);

  async function probarConexion() {
    setProbando(true);
    setStatus(null);
    await guardarConfig(baseURL, token);
    try {
      const res = await api.health();
      setStatus({ ok: true, msg: `✅ Conectado — ${res.data.nombre}` });
    } catch (e) {
      setStatus({ ok: false, msg: `❌ ${e.message}` });
    } finally {
      setProbando(false);
    }
  }

  async function guardar() {
    await guardarConfig(baseURL, token);
    Alert.alert('Guardado', 'Configuración guardada.');
  }

  async function copiar(texto) {
    await Clipboard.setStringAsync(texto);
    Alert.alert('Copiado', texto);
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configuración</Text>
        <Text style={styles.headerSub}>API · SSH · Acceso remoto</Text>
      </View>

      <View style={styles.body}>

        {/* ── Conexión API ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="server" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Servidor API</Text>
          </View>

          <Text style={styles.label}>URL del servidor</Text>
          <TextInput
            style={styles.input}
            value={baseURL}
            onChangeText={setBaseURL}
            placeholder="http://100.107.123.29:3001"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={styles.label}>Token de acceso</Text>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="tacos-aragon-2025"
            secureTextEntry
            autoCapitalize="none"
          />

          {status && (
            <View style={[styles.statusBox, { backgroundColor: status.ok ? COLORS.success + '15' : COLORS.danger + '15' }]}>
              <Text style={{ color: status.ok ? COLORS.success : COLORS.danger, fontSize: 13 }}>{status.msg}</Text>
            </View>
          )}

          <View style={styles.botonesRow}>
            <TouchableOpacity style={styles.testBtn} onPress={probarConexion} disabled={probando}>
              {probando
                ? <ActivityIndicator color={COLORS.primary} size="small" />
                : <><Ionicons name="wifi" size={15} color={COLORS.primary} /><Text style={styles.testTxt}> Probar</Text></>
              }
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={guardar}>
              <Text style={styles.saveTxt}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Acceso SSH remoto ─────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="terminal" size={18} color={COLORS.secondary} />
            <Text style={styles.cardTitle}>Acceso SSH Remoto</Text>
            <View style={[styles.tagVerde]}>
              <Ionicons name="shield-checkmark" size={11} color={COLORS.success} />
              <Text style={styles.tagVerdeTxt}>Tailscale</Text>
            </View>
          </View>

          {/* Info del servidor */}
          <View style={styles.infoGrid}>
            <InfoFila label="IP (Tailscale)" valor={SSH_INFO.ip}     onCopy={() => copiar(SSH_INFO.ip)} />
            <InfoFila label="Usuario"         valor={SSH_INFO.usuario} onCopy={() => copiar(SSH_INFO.usuario)} />
            <InfoFila label="Puerto"          valor="22" />
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {[
              { k: 'claude',  label: 'Claude Code' },
              { k: 'tablet',  label: 'Tablet' },
              { k: 'setup',   label: 'Instalar SSH' },
            ].map(t => (
              <TouchableOpacity key={t.k} style={[styles.tab, sshTab === t.k && styles.tabActive]} onPress={() => setSshTab(t.k)}>
                <Text style={[styles.tabTxt, sshTab === t.k && styles.tabTxtActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab: Claude Code Desktop */}
          {sshTab === 'claude' && (
            <View style={styles.tabContent}>
              <Text style={styles.instrTxt}>1. Abre <Text style={styles.bold}>Claude Code Desktop</Text> en tu laptop/PC</Text>
              <Text style={styles.instrTxt}>2. Clic en el dropdown de entorno (arriba del chat)</Text>
              <Text style={styles.instrTxt}>3. Selecciona <Text style={styles.bold}>+ Add SSH connection</Text></Text>
              <Text style={styles.instrTxt}>4. Ingresa estos datos:</Text>

              <CodeBox label="SSH Host" valor={SSH_INFO.cmd} onCopy={() => copiar(SSH_INFO.cmd)} />
              <CodeBox label="Puerto"   valor="22" />
              <CodeBox label="Clave"    valor="~/.ssh/id_ed25519  (ver tab Instalar SSH)" />

              <Text style={[styles.instrTxt, { marginTop: SPACING.sm, color: COLORS.textMuted }]}>
                5. Selecciona la carpeta del proyecto en el servidor y listo — Claude correrá directamente en el servidor con acceso a todos los archivos.
              </Text>
            </View>
          )}

          {/* Tab: Tablet */}
          {sshTab === 'tablet' && (
            <View style={styles.tabContent}>
              <Text style={styles.instrTxt}>Desde una tablet Android o iPad, usa una de estas apps SSH:</Text>

              {[
                {
                  app: 'Termius',
                  plat: 'Android / iOS',
                  icono: 'phone-portrait',
                  desc: 'La más completa. Soporta claves SSH, snippets y trabajo offline.',
                  buscar: 'Termius SSH client',
                },
                {
                  app: 'JuiceSSH',
                  plat: 'Android',
                  icono: 'logo-android',
                  desc: 'Ligera y rápida. Ideal para Android.',
                  buscar: 'JuiceSSH',
                },
                {
                  app: 'Blink Shell',
                  plat: 'iPad / iPhone',
                  icono: 'logo-apple',
                  desc: 'Tiene Claude Code integrado directamente en el shell.',
                  buscar: 'Blink Shell Mosh SSH',
                },
              ].map((a, i) => (
                <View key={i} style={styles.appRow}>
                  <Ionicons name={a.icono} size={20} color={COLORS.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appNom}>{a.app} <Text style={styles.appPlat}>({a.plat})</Text></Text>
                    <Text style={styles.appDesc}>{a.desc}</Text>
                  </View>
                </View>
              ))}

              <Text style={[styles.instrTxt, { marginTop: SPACING.md }]}>Configuración en la app SSH:</Text>
              <CodeBox label="Host"    valor={SSH_INFO.ip}      onCopy={() => copiar(SSH_INFO.ip)} />
              <CodeBox label="Usuario" valor={SSH_INFO.usuario} onCopy={() => copiar(SSH_INFO.usuario)} />
              <CodeBox label="Puerto"  valor="22" />
              <CodeBox label="Comando" valor="claude" onCopy={() => copiar('claude')} />
            </View>
          )}

          {/* Tab: Instalar SSH */}
          {sshTab === 'setup' && (
            <View style={styles.tabContent}>
              <View style={styles.alertBox}>
                <Ionicons name="information-circle" size={16} color={COLORS.info} />
                <Text style={styles.alertTxt}>
                  OpenSSH Server no está instalado. Ejecuta los siguientes scripts en el servidor Windows como Administrador.
                </Text>
              </View>

              <Text style={styles.instrTxt}>Los scripts están en:</Text>
              <CodeBox
                label="Paso 1 – Instalar SSH (Admin)"
                valor="C:\Users\gumaro_gonzalez\Desktop\bot-tacos\setup_ssh.ps1"
                onCopy={() => copiar('C:\\Users\\gumaro_gonzalez\\Desktop\\bot-tacos\\setup_ssh.ps1')}
              />
              <CodeBox
                label="Paso 2 – Generar claves (usuario normal)"
                valor="C:\Users\gumaro_gonzalez\Desktop\bot-tacos\setup_ssh_keys.ps1"
                onCopy={() => copiar('C:\\Users\\gumaro_gonzalez\\Desktop\\bot-tacos\\setup_ssh_keys.ps1')}
              />

              <Text style={styles.instrTxt}>O corre en PowerShell como Admin:</Text>
              <CodeBox
                label="Comando rápido"
                valor={`Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0; Start-Service sshd; Set-Service sshd -StartupType Automatic`}
                onCopy={() => copiar(`Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0; Start-Service sshd; Set-Service sshd -StartupType Automatic`)}
              />

              <Text style={[styles.instrTxt, { marginTop: SPACING.sm, color: COLORS.success }]}>
                ✅ Tailscale ya está instalado y activo ({SSH_INFO.ip}) — no necesitas abrir puertos en el router.
              </Text>
            </View>
          )}
        </View>

        {/* ── Sistemas conectados ───────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="git-network" size={18} color={COLORS.info} />
            <Text style={styles.cardTitle}>Ecosistema Conectado</Text>
          </View>
          {[
            { nombre: 'Bot WhatsApp',   icono: 'logo-whatsapp', color: COLORS.whatsapp, puerto: '–',    ruta: 'bot-tacos' },
            { nombre: 'Loyverse POS',   icono: 'storefront',    color: COLORS.primary,  puerto: 'API',  ruta: 'cloud' },
            { nombre: 'Facturama PAC',  icono: 'document-text', color: COLORS.info,     puerto: 'API',  ruta: 'cloud' },
            { nombre: 'Gemini IA',      icono: 'sparkles',      color: '#8E44AD',       puerto: 'API',  ruta: 'cloud' },
            { nombre: 'Bot Llamadas',   icono: 'call',          color: COLORS.success,  puerto: '–',    ruta: 'bot-llamadas' },
            { nombre: 'Analytics',      icono: 'analytics',     color: COLORS.warning,  puerto: '–',    ruta: 'loyverse_analytics' },
            { nombre: 'API Central',    icono: 'server',        color: COLORS.secondary, puerto: '3001', ruta: 'tacos-aragon-api' },
          ].map((s, i) => (
            <View key={i} style={styles.sysRow}>
              <View style={[styles.sysIcon, { backgroundColor: s.color + '20' }]}>
                <Ionicons name={s.icono} size={16} color={s.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sysNom}>{s.nombre}</Text>
                <Text style={styles.sysRuta}>{s.ruta}</Text>
              </View>
              {s.puerto !== '–' && (
                <View style={styles.puertoBadge}>
                  <Text style={styles.puertoBadgeTxt}>{s.puerto === 'API' ? 'CLOUD' : `:${s.puerto}`}</Text>
                </View>
              )}
              <View style={[styles.sysBadge, { backgroundColor: COLORS.success + '20' }]}>
                <Text style={[styles.sysBadgeTxt, { color: COLORS.success }]}>Activo</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── About ────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.aboutTxt}>Tacos Aragón App v1.0.0</Text>
          <Text style={styles.aboutSub}>Ecosistema de gestión — Culiacán, Sinaloa 🌮</Text>
          <Text style={styles.aboutSub}>Servidor: Windows Server 2022 · PM2</Text>
        </View>

        <View style={{ height: SPACING.xl }} />
      </View>
    </ScrollView>
  );
}

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function InfoFila({ label, valor, onCopy }) {
  return (
    <View style={styles.infoFila}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValor}>{valor}</Text>
      {onCopy && (
        <TouchableOpacity onPress={onCopy} style={styles.copyBtn}>
          <Ionicons name="copy-outline" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function CodeBox({ label, valor, onCopy }) {
  return (
    <View style={styles.codeBox}>
      {label && <Text style={styles.codeLabel}>{label}</Text>}
      <View style={styles.codeRow}>
        <Text style={styles.codeTxt} numberOfLines={2} selectable>{valor}</Text>
        {onCopy && (
          <TouchableOpacity onPress={onCopy} style={styles.copyBtn}>
            <Ionicons name="copy-outline" size={15} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 52, paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.secondary,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  headerSub:   { fontSize: 12, color: '#FFFFFF70' },

  body: { padding: SPACING.md },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.md },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },

  label: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    padding: SPACING.sm, fontSize: 13, color: COLORS.text,
    backgroundColor: COLORS.bg, marginBottom: SPACING.sm,
  },
  statusBox: { padding: SPACING.sm, borderRadius: RADIUS.sm, marginBottom: SPACING.sm },
  botonesRow: { flexDirection: 'row', gap: SPACING.sm },
  testBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.full,
    padding: SPACING.sm, paddingHorizontal: SPACING.md,
  },
  testTxt: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    padding: SPACING.sm, alignItems: 'center',
  },
  saveTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // SSH info grid
  infoGrid: { marginBottom: SPACING.sm },
  infoFila:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { width: 100, fontSize: 12, color: COLORS.textMuted },
  infoValor: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '500', fontFamily: 'monospace' },
  copyBtn:   { padding: 4 },

  tagVerde: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.success + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  tagVerdeTxt: { fontSize: 10, color: COLORS.success, fontWeight: '600' },

  tabs: { flexDirection: 'row', gap: 6, marginBottom: SPACING.sm },
  tab: { flex: 1, paddingVertical: 7, borderRadius: RADIUS.sm, backgroundColor: COLORS.bg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  tabActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  tabTxt:    { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  tabTxtActive: { color: '#FFF' },
  tabContent: { paddingTop: 4 },

  instrTxt: { fontSize: 13, color: COLORS.text, marginBottom: SPACING.sm, lineHeight: 20 },
  bold:     { fontWeight: '700' },

  codeBox: { backgroundColor: COLORS.bg, borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  codeLabel: { fontSize: 10, color: COLORS.textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  codeRow:  { flexDirection: 'row', alignItems: 'center' },
  codeTxt:  { flex: 1, fontSize: 12, color: COLORS.secondary, fontFamily: 'monospace' },

  alertBox: { flexDirection: 'row', gap: SPACING.xs, backgroundColor: COLORS.info + '15', padding: SPACING.sm, borderRadius: RADIUS.sm, marginBottom: SPACING.sm },
  alertTxt: { flex: 1, fontSize: 12, color: COLORS.info, lineHeight: 18 },

  appRow:   { flexDirection: 'row', gap: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'flex-start' },
  appNom:   { fontSize: 13, fontWeight: '700', color: COLORS.text },
  appPlat:  { fontWeight: '400', color: COLORS.textMuted },
  appDesc:  { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  sysRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.sm },
  sysIcon:  { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sysNom:   { fontSize: 13, fontWeight: '600', color: COLORS.text },
  sysRuta:  { fontSize: 10, color: COLORS.textMuted },
  sysBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  sysBadgeTxt: { fontSize: 10, fontWeight: '600' },
  puertoBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, backgroundColor: COLORS.secondary + '15', marginRight: 4 },
  puertoBadgeTxt: { fontSize: 10, color: COLORS.secondary, fontFamily: 'monospace', fontWeight: '600' },

  aboutTxt: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  aboutSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
