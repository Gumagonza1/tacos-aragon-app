import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { COLORS, SPACING, RADIUS, SHADOW } from '../theme';

const CATEGORIAS = ['insumo', 'producto', 'herramienta', 'otros'];
const UNIDADES   = ['kg', 'gr', 'litro', 'ml', 'pza', 'caja', 'bolsa', 'rollo'];

export default function InventarioScreen() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [analisis,   setAnalisis]   = useState('');
  const [analLoad,   setAnalLoad]   = useState(false);
  const [filtro,     setFiltro]     = useState('');     // texto busqueda
  const [catFiltro,  setCatFiltro]  = useState('');     // categoria filtro
  const [modalOpen,  setModalOpen]  = useState(false);  // crear/editar
  const [editItem,   setEditItem]   = useState(null);   // item a editar
  const [cantModal,  setCantModal]  = useState(null);   // id item para actualizar cantidad
  const [nuevaCant,  setNuevaCant]  = useState('');
  const [tab,        setTab]        = useState('lista'); // 'lista' | 'analisis'

  const [form, setForm] = useState({
    nombre: '', categoria: 'insumo', unidad: 'pza',
    cantidad: '', costo_unitario: '', minimo: '',
  });

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const r = await api.inventario(catFiltro || undefined);
      setItems(r.data || []);
    } catch {}
    setLoading(false);
  }

  async function guardar() {
    if (!form.nombre || !form.categoria) { Alert.alert('Faltan datos'); return; }
    const payload = {
      nombre:         form.nombre,
      categoria:      form.categoria,
      unidad:         form.unidad,
      cantidad:       parseFloat(form.cantidad || 0),
      costo_unitario: parseFloat(form.costo_unitario || 0),
      minimo:         parseFloat(form.minimo || 0),
    };
    try {
      if (editItem) {
        await api.actualizarItem(editItem.id, payload);
      } else {
        await api.crearItemInventario(payload);
      }
      setModalOpen(false);
      setEditItem(null);
      setForm({ nombre:'', categoria:'insumo', unidad:'pza', cantidad:'', costo_unitario:'', minimo:'' });
      cargar();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message);
    }
  }

  async function actualizarCantidad() {
    const val = parseFloat(nuevaCant);
    if (isNaN(val) || val < 0) { Alert.alert('Cantidad invalida'); return; }
    try {
      await api.actualizarCantidad(cantModal, val);
      setCantModal(null);
      setNuevaCant('');
      cargar();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message);
    }
  }

  async function generarAnalisis() {
    setAnalLoad(true);
    setAnalisis('');
    try {
      const r = await api.analisisInventario();
      setAnalisis(r.data.analisis);
    } catch { setAnalisis('Error al generar analisis.'); }
    setAnalLoad(false);
  }

  function abrirEditar(item) {
    setEditItem(item);
    setForm({
      nombre:         item.nombre,
      categoria:      item.categoria,
      unidad:         item.unidad,
      cantidad:       String(item.cantidad),
      costo_unitario: String(item.costo_unitario),
      minimo:         String(item.minimo),
    });
    setModalOpen(true);
  }

  const itemsFiltrados = items.filter(i =>
    (!filtro || i.nombre.toLowerCase().includes(filtro.toLowerCase())) &&
    (!catFiltro || i.categoria === catFiltro)
  );
  const alertas = items.filter(i => i.alerta);
  const valorTotal = items.reduce((s, i) => s + i.valor_total, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>CFO ARAGON</Text>
          <Text style={styles.headerTitle}>Inventario</Text>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.statVal}>{items.length}</Text>
          <Text style={styles.statLbl}>items</Text>
          {alertas.length > 0 && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeTxt}>{alertas.length} alertas</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[['lista','Inventario'],['analisis','Analisis CFO']].map(([k,l]) => (
          <TouchableOpacity key={k} style={[styles.tab, tab===k && styles.tabActive]} onPress={() => setTab(k)}>
            <Text style={[styles.tabTxt, tab===k && styles.tabTxtActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'lista' ? (
        <>
          {/* Barra busqueda y filtros */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput style={styles.searchInput} value={filtro} onChangeText={setFiltro}
              placeholder="Buscar..." placeholderTextColor={COLORS.textMuted} />
          </View>

          <View style={styles.catRow}>
            {['', ...CATEGORIAS].map(c => (
              <TouchableOpacity key={c} style={[styles.catChip, catFiltro===c && styles.catChipActive]}
                onPress={() => { setCatFiltro(c); cargar(); }}>
                <Text style={[styles.catChipTxt, catFiltro===c && styles.catChipTxtActive]}>{c || 'Todos'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* KPI valor total */}
          <View style={styles.kpiBar}>
            <Text style={styles.kpiLbl}>Valor total inventario:</Text>
            <Text style={styles.kpiVal}>${valorTotal.toLocaleString('es-MX',{minimumFractionDigits:0})}</Text>
          </View>

          {loading
            ? <ActivityIndicator color={COLORS.primary} style={{ margin: 40 }} />
            : (
              <FlatList
                data={itemsFiltrados}
                keyExtractor={i => String(i.id)}
                contentContainerStyle={{ padding: SPACING.sm, paddingBottom: 100 }}
                renderItem={({ item }) => (
                  <ItemRow item={item}
                    onEdit={() => abrirEditar(item)}
                    onCantidad={() => { setCantModal(item.id); setNuevaCant(String(item.cantidad)); }}
                    onDelete={() =>
                      Alert.alert('Eliminar', `Eliminar "${item.nombre}"?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: async () => { await api.eliminarItemInv(item.id); cargar(); } },
                      ])
                    }
                  />
                )}
                ListEmptyComponent={<Text style={styles.emptyTxt}>Sin items. Toca + para agregar.</Text>}
              />
            )
          }

          {/* FAB agregar */}
          <TouchableOpacity style={styles.fab}
            onPress={() => { setEditItem(null); setForm({ nombre:'', categoria:'insumo', unidad:'pza', cantidad:'', costo_unitario:'', minimo:'' }); setModalOpen(true); }}>
            <Ionicons name="add" size={28} color="#FFF" />
          </TouchableOpacity>
        </>
      ) : (
        <View style={{ flex: 1, padding: SPACING.md }}>
          <TouchableOpacity style={styles.analBtn} onPress={generarAnalisis} disabled={analLoad}>
            {analLoad
              ? <ActivityIndicator color="#FFF" />
              : <><Ionicons name="analytics" size={16} color="#FFF" /><Text style={styles.analBtnTxt}>Analizar con Claude</Text></>
            }
          </TouchableOpacity>

          {alertas.length > 0 && (
            <View style={styles.alertBox}>
              <Text style={styles.alertTitle}>Items bajo el minimo:</Text>
              {alertas.map(a => (
                <Text key={a.id} style={styles.alertItem}>- {a.nombre}: {a.cantidad} {a.unidad} (min: {a.minimo})</Text>
              ))}
            </View>
          )}

          {analisis ? (
            <View style={styles.analCard}>
              <Text style={styles.analTxt}>{analisis}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Modal crear/editar item */}
      <Modal transparent animationType="slide" visible={modalOpen} onRequestClose={() => setModalOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setModalOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>{editItem ? 'Editar Item' : 'Nuevo Item'}</Text>

                {[
                  { label: 'Nombre', key: 'nombre', placeholder: 'Ej: Carne de res' },
                ].map(f => (
                  <View key={f.key}>
                    <Text style={styles.formLabel}>{f.label}</Text>
                    <TextInput style={styles.formInput} value={form[f.key]}
                      onChangeText={v => setForm(p => ({...p, [f.key]: v}))}
                      placeholder={f.placeholder} placeholderTextColor={COLORS.textMuted} />
                  </View>
                ))}

                <Text style={styles.formLabel}>Categoria</Text>
                <View style={styles.chipRow}>
                  {CATEGORIAS.map(c => (
                    <TouchableOpacity key={c} style={[styles.chip, form.categoria===c && styles.chipAct]}
                      onPress={() => setForm(p => ({...p, categoria: c}))}>
                      <Text style={[styles.chipT, form.categoria===c && styles.chipTAct]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.formLabel}>Unidad</Text>
                <View style={styles.chipRow}>
                  {UNIDADES.map(u => (
                    <TouchableOpacity key={u} style={[styles.chip, form.unidad===u && styles.chipAct]}
                      onPress={() => setForm(p => ({...p, unidad: u}))}>
                      <Text style={[styles.chipT, form.unidad===u && styles.chipTAct]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.triRow}>
                  {[
                    { label: 'Cantidad', key: 'cantidad' },
                    { label: 'Costo/u ($)', key: 'costo_unitario' },
                    { label: 'Minimo', key: 'minimo' },
                  ].map(f => (
                    <View key={f.key} style={{ flex: 1, marginHorizontal: 2 }}>
                      <Text style={styles.formLabel}>{f.label}</Text>
                      <TextInput style={styles.formInputSm} value={form[f.key]}
                        onChangeText={v => setForm(p => ({...p, [f.key]: v}))}
                        keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textMuted} />
                    </View>
                  ))}
                </View>

                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                    <Text style={styles.cancelTxt}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={guardar}>
                    <Text style={styles.saveTxt}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal actualizar cantidad */}
      <Modal transparent animationType="fade" visible={!!cantModal} onRequestClose={() => setCantModal(null)}>
        <TouchableWithoutFeedback onPress={() => setCantModal(null)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalBox, { paddingVertical: SPACING.lg }]}>
                <Text style={styles.modalTitle}>Actualizar Cantidad</Text>
                <TextInput style={[styles.formInput, { fontSize: 24, textAlign: 'center', marginVertical: SPACING.md }]}
                  value={nuevaCant} onChangeText={setNuevaCant} keyboardType="decimal-pad" autoFocus />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setCantModal(null)}>
                    <Text style={styles.cancelTxt}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={actualizarCantidad}>
                    <Text style={styles.saveTxt}>Guardar</Text>
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

function ItemRow({ item, onEdit, onCantidad, onDelete }) {
  return (
    <View style={[itemStyles.row, item.alerta && itemStyles.rowAlerta]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={itemStyles.nombre}>{item.nombre}</Text>
          {item.alerta && <View style={itemStyles.alertaDot} />}
        </View>
        <Text style={itemStyles.meta}>{item.categoria} · {item.unidad} · ${item.costo_unitario}/u</Text>
        <Text style={itemStyles.valor}>${item.valor_total.toLocaleString('es-MX',{minimumFractionDigits:0})} total</Text>
      </View>
      <TouchableOpacity style={itemStyles.cantBtn} onPress={onCantidad}>
        <Text style={[itemStyles.cantVal, item.alerta && { color: COLORS.danger }]}>{item.cantidad}</Text>
        <Text style={itemStyles.cantU}>{item.unidad}</Text>
      </TouchableOpacity>
      <View style={itemStyles.actions}>
        <TouchableOpacity onPress={onEdit} style={itemStyles.actionBtn}>
          <Ionicons name="pencil" size={15} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={itemStyles.actionBtn}>
          <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  row:      { backgroundColor: '#FFF', borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: 4, flexDirection: 'row', alignItems: 'center', ...SHADOW.card },
  rowAlerta:{ borderLeftWidth: 3, borderLeftColor: COLORS.danger },
  nombre:   { fontSize: 13, fontWeight: '700', color: COLORS.text },
  meta:     { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  valor:    { fontSize: 11, color: COLORS.success, fontWeight: '600', marginTop: 1 },
  alertaDot:{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger },
  cantBtn:  { alignItems: 'center', marginHorizontal: SPACING.sm, minWidth: 50 },
  cantVal:  { fontSize: 20, fontWeight: '800', color: COLORS.text },
  cantU:    { fontSize: 10, color: COLORS.textMuted },
  actions:  { gap: 6 },
  actionBtn:{ padding: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 52, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg,
    backgroundColor: '#1A3A2A',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  headerSub:   { fontSize: 10, fontWeight: '700', color: COLORS.success, letterSpacing: 1.5 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  headerStats: { alignItems: 'flex-end' },
  statVal:     { fontSize: 22, fontWeight: '800', color: '#FFF' },
  statLbl:     { fontSize: 11, color: '#FFFFFF80' },
  alertBadge:  { backgroundColor: COLORS.danger, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  alertBadgeTxt:{ fontSize: 10, color: '#FFF', fontWeight: '700' },

  tabRow:    { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:       { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.success },
  tabTxt:    { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  tabTxtActive: { color: COLORS.success },

  searchBar:   { flexDirection: 'row', alignItems: 'center', margin: SPACING.sm, backgroundColor: '#FFF', borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, ...SHADOW.card },
  searchInput: { flex: 1, padding: SPACING.sm, fontSize: 13, color: COLORS.text },

  catRow:    { flexDirection: 'row', gap: 6, paddingHorizontal: SPACING.sm, paddingBottom: SPACING.xs },
  catChip:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.border },
  catChipActive:{ backgroundColor: COLORS.success, borderColor: COLORS.success },
  catChipTxt:{ fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  catChipTxtActive:{ color: '#FFF' },

  kpiBar:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 6, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  kpiLbl:    { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  kpiVal:    { fontSize: 14, fontWeight: '800', color: COLORS.success },

  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4 },

  analBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.success, padding: SPACING.sm + 2, borderRadius: RADIUS.full, marginBottom: SPACING.md },
  analBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  alertBox:   { backgroundColor: COLORS.danger + '10', borderRadius: RADIUS.sm, padding: SPACING.sm, marginBottom: SPACING.sm, borderLeftWidth: 3, borderLeftColor: COLORS.danger },
  alertTitle: { fontSize: 13, fontWeight: '700', color: COLORS.danger, marginBottom: 4 },
  alertItem:  { fontSize: 12, color: COLORS.danger },
  analCard:   { backgroundColor: '#FFF', borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOW.card },
  analTxt:    { fontSize: 13, color: COLORS.text, lineHeight: 20 },

  emptyTxt: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  formLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: SPACING.sm },
  formInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.sm, fontSize: 14, color: COLORS.text },
  formInputSm: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: SPACING.xs + 2, fontSize: 13, color: COLORS.text, textAlign: 'center' },
  triRow: { flexDirection: 'row', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  chipAct: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  chipT: { fontSize: 12, color: COLORS.text },
  chipTAct: { color: '#FFF', fontWeight: '700' },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: { flex: 1, padding: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelTxt: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  saveBtn: { flex: 1, padding: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.success, alignItems: 'center' },
  saveTxt: { fontSize: 14, color: '#FFF', fontWeight: '700' },
});
