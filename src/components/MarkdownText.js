import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

/**
 * Renderizador simple de markdown para burbujas del chat.
 * Soporta: **negrita**, ## encabezados, - listas, líneas normales.
 */

function renderInline(text, baseStyle) {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={[baseStyle, styles.bold]}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return (
      <Text key={i} style={baseStyle}>
        {part}
      </Text>
    );
  });
}

export default function MarkdownText({ children, isUser = false }) {
  const lines = (children || '').split('\n');
  const textColor = isUser ? styles.userText : styles.botText;

  return (
    <View>
      {lines.map((line, i) => {
        // Línea vacía → espacio
        if (!line.trim()) {
          return <View key={i} style={{ height: 5 }} />;
        }

        // Encabezado ## o #
        if (/^#{1,3}\s/.test(line)) {
          const text = line.replace(/^#+\s/, '');
          return (
            <Text key={i} style={[styles.heading, textColor]}>
              {renderInline(text, [styles.heading, textColor])}
            </Text>
          );
        }

        // Línea horizontal ---
        if (/^---+$/.test(line.trim())) {
          return <View key={i} style={styles.hr} />;
        }

        // Bullet - o *
        if (/^[-*]\s/.test(line)) {
          const text = line.replace(/^[-*]\s/, '');
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bullet, textColor]}>•</Text>
              <Text style={[styles.bulletText, textColor]}>
                {renderInline(text, [styles.bulletText, textColor])}
              </Text>
            </View>
          );
        }

        // Línea normal
        return (
          <Text key={i} style={[styles.p, textColor]}>
            {renderInline(line, [styles.p, textColor])}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  botText:  { color: COLORS.text },
  userText: { color: '#FFF' },

  heading: {
    fontSize:    15,
    fontWeight:  '700',
    marginTop:   4,
    marginBottom: 2,
    lineHeight:  22,
  },
  p: {
    fontSize:   14,
    lineHeight: 21,
  },
  bold: {
    fontWeight: '700',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    marginVertical: 1,
  },
  bullet: {
    fontSize:    14,
    marginRight: 6,
    lineHeight:  21,
  },
  bulletText: {
    flex:       1,
    fontSize:   14,
    lineHeight: 21,
  },
  hr: {
    height:          1,
    backgroundColor: COLORS.border || '#333',
    marginVertical:  6,
    opacity:         0.4,
  },
});
