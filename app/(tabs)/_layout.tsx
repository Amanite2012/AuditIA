/**
 * Navigation par onglets : Briefing → Entretien → Analyse → Historique
 * (modules 1 à 4, section 2.1).
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { colors, fontSizes } from '../../components/shared/theme';

export default function TabsLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.hairline,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: fontSizes.body - 4 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="briefing/index"
        options={{
          title: 'Briefing',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="checklist" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="entretien/index"
        options={{
          title: 'Entretien',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="record-voice-over" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analyse/index"
        options={{
          title: 'Analyse',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="fact-check" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="historique/index"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="history" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
