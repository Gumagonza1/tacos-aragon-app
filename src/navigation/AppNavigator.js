import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

import DashboardScreen from '../screens/DashboardScreen';
import VentasScreen    from '../screens/VentasScreen';
import AgenteScreen    from '../screens/AgenteScreen';
import WhatsAppScreen  from '../screens/WhatsAppScreen';
import FacturarScreen  from '../screens/FacturarScreen';
import MonitorScreen   from '../screens/MonitorScreen';
import ConfigScreen    from '../screens/ConfigScreen';
import CfoScreen       from '../screens/CfoScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor:   COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              Dashboard: focused ? 'home'        : 'home-outline',
              Ventas:    focused ? 'bar-chart'   : 'bar-chart-outline',
              Agente:    focused ? 'sparkles'    : 'sparkles-outline',
              WhatsApp:  focused ? 'logo-whatsapp' : 'logo-whatsapp',
              Facturar:  focused ? 'document-text' : 'document-text-outline',
              CFO:       focused ? 'briefcase'   : 'briefcase-outline',
              Monitor:   focused ? 'eye'         : 'eye-outline',
              Config:    focused ? 'settings'    : 'settings-outline',
            };
            return (
              route.name === 'Agente'
                ? <View style={[styles.agentIcon, focused && styles.agentIconActive]}>
                    <Ionicons name="sparkles" size={22} color={focused ? '#FFF' : COLORS.textMuted} />
                  </View>
                : <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />
            );
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Inicio' }} />
        <Tab.Screen name="Ventas"    component={VentasScreen} />
        <Tab.Screen name="Agente"    component={AgenteScreen}   options={{ tabBarLabel: 'IA' }} />
        <Tab.Screen name="WhatsApp"  component={WhatsAppScreen} />
        <Tab.Screen name="Facturar"  component={FacturarScreen} />
        <Tab.Screen name="CFO"       component={CfoScreen}      options={{ tabBarLabel: 'CFO' }} />
        <Tab.Screen name="Monitor"   component={MonitorScreen}  options={{ tabBarLabel: 'Monitor' }} />
        <Tab.Screen name="Config"    component={ConfigScreen}   options={{ tabBarLabel: '' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFF',
    borderTopWidth:  1,
    borderTopColor:  '#E8ECF0',
    height:          62,
    paddingBottom:   8,
    paddingTop:      4,
    elevation:       8,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  agentIcon: {
    width:           42,
    height:          42,
    borderRadius:    21,
    backgroundColor: COLORS.border,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    4,
  },
  agentIconActive: {
    backgroundColor: COLORS.primary,
    shadowColor:     COLORS.primary,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.4,
    shadowRadius:    6,
    elevation:       6,
  },
});
