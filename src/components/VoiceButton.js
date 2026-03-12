import React, { useState, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { COLORS, SHADOW, RADIUS } from '../theme';

/**
 * Botón de voz que graba audio y llama a onAudioReady(uri) al soltar.
 */
export default function VoiceButton({ onAudioReady, disabled, size = 72 }) {
  const [grabando, setGrabando] = useState(false);
  const recordingRef = useRef(null);
  const pulseAnim    = useRef(new Animated.Value(1)).current;

  function iniciarPulso() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }

  function detenerPulso() {
    pulseAnim.stopAnimation();
    Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true }).start();
  }

  async function iniciarGrabacion() {
    if (disabled) return;
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpiece: false,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setGrabando(true);
      iniciarPulso();
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {};
    } catch (err) {
      console.error('Error al grabar:', err);
    }
  }

  async function detenerGrabacion() {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, shouldDuckAndroid: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setGrabando(false);
      detenerPulso();
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {};
      if (uri && onAudioReady) onAudioReady(uri);
    } catch (err) {
      console.error('Error al detener grabación:', err);
      setGrabando(false);
      detenerPulso();
    }
  }

  return (
    <View style={styles.container}>
      {grabando && (
        <Animated.View
          style={[
            styles.ripple,
            { width: size * 1.4, height: size * 1.4, borderRadius: size * 0.7 },
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
      )}
      <TouchableOpacity
        onPressIn={iniciarGrabacion}
        onPressOut={detenerGrabacion}
        activeOpacity={0.85}
        disabled={disabled}
        style={[
          styles.btn,
          { width: size, height: size, borderRadius: size / 2 },
          grabando && styles.btnActivo,
          disabled && styles.btnDisabled,
        ]}
      >
        <Ionicons
          name={grabando ? 'radio' : 'mic'}
          size={size * 0.4}
          color="#FFF"
        />
      </TouchableOpacity>
      <Text style={styles.hint}>
        {grabando ? 'Suelta para enviar' : 'Mantén para hablar'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position:        'absolute',
    backgroundColor: COLORS.primary + '30',
  },
  btn: {
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
    ...SHADOW.strong,
  },
  btnActivo: {
    backgroundColor: COLORS.danger,
  },
  btnDisabled: {
    backgroundColor: COLORS.border,
  },
  hint: {
    marginTop:  8,
    fontSize:   12,
    color:      COLORS.textMuted,
    fontWeight: '500',
  },
});
