import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, ScrollView, Switch, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS, SPACING, RADIUS, SHADOW } from '../theme';

export default function WhatsAppScreen() {
  const [lista,     setLista]     = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refresh,   setRefresh]   = useState(false);
  const [selec,     setSelec]     = useState(null);     // conversación seleccionada
  const [detalle,   setDetalle]   = useState(null);     // detalle modal
  const [modalVis,  setModalVis]  = useState(false);

  const cargar = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefresh(true) : setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.conversaciones(),
        api.statsWhatsApp(),
      ]);
      setLista(listRes.data || []);
      setStats(statsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useEffect(() => { cargar(); }, []);

  async function abrirDetalle(conv) {
    setSelec(conv);
    setModalVis(true);
    try {
      const res = await api.conversacion(conv.phone);
      setDetalle(res.data);
    } catch {}
  }

  async function togglePausa(phone, pausar) {
    try {
      await api.pausarBot(phone, pausar);
      cargar();
    } catch (e) {
      console.error(e);
    }
  }

  function formatPhone(p) {
    // 521XXXXXXXXXX → +52 1 XXX XXX XXXX
    return `+${p}`;
  }

  function tiempoRelativo(ts) {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1)  return 'ahora';
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    if (h  < 24)  return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.whatsapp} /></View>;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WhatsApp Bot</Text>
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{stats.totalConversaciones} chats</Text>
            </View>
            {stats.pausadas > 0 && (
              <View style={[styles.badge, { backgroundColor: COLORS.danger + '20' }]}>
                <Ionicons name="pause-circle" size={12} color={COLORS.danger} />
                <Text style={[styles.badgeTxt, { color: COLORS.danger }]}>{stats.pausadas} pausados</Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="radio" size={12} color={COLORS.success} />
              <Text style={[styles.badgeTxt, { color: COLORS.success }]}>{stats.activasUltimaHora} activos</Text>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={lista}
        keyExtractor={item => item.phone}
        refreshControl={<RefreshControl refreshing={refresh} onRefresh={() => cargar(true)} colors={[COLORS.whatsapp]} />}
        ListEmptyComponent={<Text style={styles.empty}>Sin conversaciones</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => abrirDetalle(item)}>
            <View style={[styles.avatar, { backgroundColor: item.pausado ? COLORS.danger + '20' : COLORS.whatsapp + '20' }]}>
              <Ionicons
                name={item.pausado ? 'person' : 'logo-whatsapp'}
                size={20}
                color={item.pausado ? COLORS.danger : COLORS.whatsapp}
              />
            </View>
            <View style={styles.itemBody}>
              <View style={styles.itemRow}>
                <Text style={styles.itemPhone}>{formatPhone(item.phone)}</Text>
                <Text style={styles.itemTs}>{tiempoRelativo(item.timestamp)}</Text>
              </View>
              <Text style={styles.itemMsg} numberOfLines={1}>{item.ultimoMensaje || 'Sin mensajes'}</Text>
              <View style={styles.itemTagRow}>
                {item.pausado && <View style={[styles.tag, { backgroundColor: COLORS.danger + '15' }]}><Text style={[styles.tagTxt, { color: COLORS.danger }]}>Humano</Text></View>}
                {item.esperaRespuesta && !item.pausado && <View style={[styles.tag, { backgroundColor: COLORS.warning + '15' }]}><Text style={[styles.tagTxt, { color: COLORS.warning }]}>Esperando</Text></View>}
                <Text style={styles.itemCount}>{item.mensajes} msg</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={lista.length === 0 ? styles.center : undefined}
      />

      {/* Modal detalle */}
      <Modal visible={modalVis} animationType="slide" onRequestClose={() => setModalVis(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVis(false)}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selec ? formatPhone(selec.phone) : ''}</Text>
            {selec && (
              <View style={styles.pausaRow}>
                <Text style={styles.pausaLabel}>{selec.pausado ? 'Humano' : 'Bot'}</Text>
                <Switch
                  value={!selec.pausado}
                  onValueChange={v => { togglePausa(selec.phone, !v); setModalVis(false); }}
                  trackColor={{ false: COLORS.success, true: COLORS.danger }}
                  thumbColor="#FFF"
                />
              </View>
            )}
          </View>

          {detalle ? (
            <ScrollView style={styles.historia} contentContainerStyle={styles.historiaContent}>
              {(detalle.historia || '').split('\n').filter(Boolean).map((linea, i) => {
                const esCliente = linea.startsWith('Cliente:') || linea.startsWith('User:');
                return (
                  <View key={i} style={[styles.lineaBurbuja, esCliente ? styles.lineaCliente : styles.lineaBot]}>
                    <Text style={[styles.lineaTxt, esCliente && styles.lineaTxtCliente]} numberOfLines={20}>
                      {linea}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.center}><ActivityIndicator color={COLORS.whatsapp} /></View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  empty:     { textAlign: 'center', color: COLORS.textMuted, marginTop: SPACING.xl },

  header: {
    paddingTop:    52,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: '#075E54',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFF', marginBottom: SPACING.xs },
  statsRow:    { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  badgeTxt: { fontSize: 11, color: '#FFF', fontWeight: '500' },

  item: {
    flexDirection:  'row',
    backgroundColor: COLORS.card,
    padding:        SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1 },
  itemRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  itemPhone: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemTs:    { fontSize: 11, color: COLORS.textMuted },
  itemMsg:   { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  itemTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm },
  tagTxt:    { fontSize: 10, fontWeight: '600' },
  itemCount: { fontSize: 10, color: COLORS.textMuted, marginLeft: 'auto' },

  modal: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        SPACING.md,
    paddingTop:     52,
    backgroundColor: '#075E54',
    gap: SPACING.sm,
  },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#FFF' },
  pausaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pausaLabel: { fontSize: 12, color: '#FFF' },

  historia:        { flex: 1 },
  historiaContent: { padding: SPACING.md, gap: SPACING.xs },
  lineaBurbuja: {
    maxWidth: '85%',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: 4,
  },
  lineaBot: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 4,
    ...SHADOW.card,
  },
  lineaCliente: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  lineaTxt:        { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  lineaTxtCliente: { color: '#111' },
});
