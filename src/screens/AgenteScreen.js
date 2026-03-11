import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import VoiceButton from '../components/VoiceButton';
import { api } from '../api/client';
import { COLORS, SPACING, RADIUS, SHADOW } from '../theme';

const SESSION_ID = `app-${Date.now()}`;

export default function AgenteScreen() {
  const [mensajes,    setMensajes]    = useState([
    { rol: 'bot', texto: '¡Hola! Soy el asistente de Tacos Aragón 🌮\nPuede preguntarme sobre ventas, pedidos, WhatsApp o lo que necesites. También puedes usar el micrófono.' },
  ]);
  const [texto,       setTexto]       = useState('');
  const [cargando,    setCargando]    = useState(false);
  const [hablandoIA,  setHablandoIA]  = useState(false);
  const scrollRef = useRef(null);

  function agregarMensaje(rol, contenido) {
    setMensajes(prev => [...prev, { rol, texto: contenido }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  const enviarTexto = useCallback(async (msgTexto) => {
    const msg = (msgTexto || texto).trim();
    if (!msg || cargando) return;
    setTexto('');
    agregarMensaje('user', msg);
    setCargando(true);
    try {
      const res = await api.chat(SESSION_ID, msg);
      const respuesta = res.data.respuesta;
      agregarMensaje('bot', respuesta);
      // Leer la respuesta en voz alta
      leerEnVoz(respuesta);
    } catch (err) {
      agregarMensaje('bot', `❌ Error: ${err.message}`);
    } finally {
      setCargando(false);
    }
  }, [texto, cargando]);

  const onAudioListo = useCallback(async (uri) => {
    agregarMensaje('user', '🎤 [Mensaje de voz]');
    setCargando(true);
    try {
      const res = await api.vozChat(SESSION_ID, uri);
      const { transcripcion, respuesta } = res.data;
      // Reemplazar el placeholder con la transcripción
      setMensajes(prev => {
        const copia = [...prev];
        const idx   = copia.findLastIndex(m => m.texto === '🎤 [Mensaje de voz]');
        if (idx >= 0) copia[idx] = { rol: 'user', texto: `🎤 "${transcripcion}"` };
        return copia;
      });
      agregarMensaje('bot', respuesta);
      leerEnVoz(respuesta);
    } catch (err) {
      agregarMensaje('bot', `❌ Error al procesar voz: ${err.message}`);
    } finally {
      setCargando(false);
    }
  }, []);

  function leerEnVoz(texto) {
    Speech.stop();
    const maxChars = 400;
    const textoCorto = texto.length > maxChars ? texto.slice(0, maxChars) + '…' : texto;
    setHablandoIA(true);
    Speech.speak(textoCorto, {
      language: 'es-MX',
      rate:     1.0,
      onDone:   () => setHablandoIA(false),
      onError:  () => setHablandoIA(false),
    });
  }

  function detenerVoz() {
    Speech.stop();
    setHablandoIA(false);
  }

  const sugerencias = [
    '¿Cuánto vendemos hoy?',
    'Resumen de la semana',
    '¿Cuál es el producto más vendido?',
    '¿Cuántas conversaciones activas hay?',
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <LinearGradient colors={[COLORS.secondary, '#1a252f']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatarBox}>
            <Ionicons name="sparkles" size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Asistente Aragón</Text>
            <Text style={styles.headerSub}>Con acceso a todos los sistemas</Text>
          </View>
          {hablandoIA && (
            <TouchableOpacity onPress={detenerVoz} style={styles.stopBtn}>
              <Ionicons name="volume-mute" size={18} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Mensajes */}
      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
      >
        {mensajes.map((m, i) => (
          <View key={i} style={[styles.burbuja, m.rol === 'user' ? styles.burbujaUser : styles.burbujaBot]}>
            {m.rol === 'bot' && (
              <Ionicons name="sparkles" size={14} color={COLORS.primary} style={{ marginBottom: 4 }} />
            )}
            <Text style={[styles.burbujaTexto, m.rol === 'user' && styles.burbujaTextoUser]}>
              {m.texto}
            </Text>
          </View>
        ))}
        {cargando && (
          <View style={[styles.burbuja, styles.burbujaBot]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
      </ScrollView>

      {/* Sugerencias */}
      {mensajes.length <= 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sugsScroll} contentContainerStyle={styles.sugsContent}>
          {sugerencias.map((s, i) => (
            <TouchableOpacity key={i} style={styles.sug} onPress={() => enviarTexto(s)}>
              <Text style={styles.sugTxt}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input + Voz */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribe o usa el micrófono..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => enviarTexto()}
          editable={!cargando}
        />
        {texto.trim() ? (
          <TouchableOpacity style={styles.sendBtn} onPress={() => enviarTexto()} disabled={cargando}>
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.micContainer}>
            <VoiceButton onAudioReady={onAudioListo} disabled={cargando} size={44} />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: { paddingTop: 52, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatarBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  headerSub:   { fontSize: 12, color: '#FFFFFF80' },
  stopBtn: {
    marginLeft: 'auto',
    backgroundColor: COLORS.danger + '50',
    padding: 8, borderRadius: 20,
  },

  chat: { flex: 1 },
  chatContent: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.lg },

  burbuja: {
    maxWidth: '82%',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm + 4,
    marginBottom: 4,
  },
  burbujaBot: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 4,
    ...SHADOW.card,
  },
  burbujaUser: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  burbujaTexto:     { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  burbujaTextoUser: { color: '#FFF' },

  sugsScroll:   { maxHeight: 50 },
  sugsContent:  { paddingHorizontal: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.sm },
  sug: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  sugTxt: { fontSize: 13, color: COLORS.text },

  inputRow: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    padding:        SPACING.sm,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  input: {
    flex:           1,
    minHeight:      44,
    maxHeight:      100,
    backgroundColor: COLORS.bg,
    borderRadius:   RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize:       14,
    color:          COLORS.text,
  },
  sendBtn: {
    width:  44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.strong,
  },
  micContainer: { paddingBottom: 0 },
});
