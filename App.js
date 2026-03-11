import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { cargarConfig } from './src/api/client';
import { COLORS } from './src/theme';

export default function App() {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    cargarConfig().finally(() => setListo(true));
  }, []);

  if (!listo) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary }}>
      <ActivityIndicator size="large" color="#FFF" />
    </View>
  );

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
