import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOW } from '../theme';

export default function StatCard({ titulo, valor, subtitulo, icono, color, small }) {
  const c = color || COLORS.primary;
  return (
    <View style={[styles.card, small && styles.small]}>
      <View style={[styles.iconBox, { backgroundColor: c + '20' }]}>
        <Ionicons name={icono || 'stats-chart'} size={small ? 18 : 22} color={c} />
      </View>
      <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text>
      <Text style={[styles.valor, { color: c }]} numberOfLines={1}>{valor}</Text>
      {subtitulo ? <Text style={styles.sub} numberOfLines={1}>{subtitulo}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius:    RADIUS.md,
    padding:         SPACING.md,
    flex:            1,
    ...SHADOW.card,
  },
  small: {
    padding: SPACING.sm,
  },
  iconBox: {
    width:        38,
    height:       38,
    borderRadius: RADIUS.sm,
    alignItems:   'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  titulo: {
    fontSize:  11,
    color:     COLORS.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valor: {
    fontSize:    20,
    fontWeight:  '700',
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
    color:    COLORS.textMuted,
  },
});
