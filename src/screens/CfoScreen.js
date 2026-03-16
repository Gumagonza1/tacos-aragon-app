import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../theme';
import ImpuestosScreen    from './ImpuestosScreen';
import ContabilidadScreen from './ContabilidadScreen';
import InventarioScreen   from './InventarioScreen';

const TABS = [
  { key: 'impuestos',    label: 'Impuestos',    color: '#1A1A2E' },
  { key: 'contabilidad', label: 'Contabilidad', color: COLORS.secondary },
  { key: 'inventario',   label: 'Inventario',   color: '#1A3A2A' },
];

export default function CfoScreen() {
  const [tab, setTab] = useState('impuestos');
  const activeColor = TABS.find(t => t.key === tab)?.color || COLORS.secondary;

  return (
    <View style={styles.container}>
      {/* Sub-navegacion horizontal */}
      <View style={[styles.navbar, { backgroundColor: activeColor }]}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.navItem, tab === t.key && styles.navItemActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.navLabel, tab === t.key && styles.navLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pantalla activa */}
      <View style={styles.content}>
        {tab === 'impuestos'    && <ImpuestosScreen />}
        {tab === 'contabilidad' && <ContabilidadScreen />}
        {tab === 'inventario'   && <InventarioScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navbar: {
    flexDirection:      'row',
    paddingTop:         4,
    paddingBottom:      4,
    paddingHorizontal:  SPACING.sm,
  },
  navItem: {
    flex:           1,
    paddingVertical: 8,
    alignItems:     'center',
    borderRadius:   RADIUS.sm,
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  navLabel: {
    fontSize:   12,
    fontWeight: '600',
    color:      'rgba(255,255,255,0.55)',
  },
  navLabelActive: {
    color:      '#FFF',
    fontWeight: '800',
  },
  content: { flex: 1 },
});
