import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';

import { useLexicon } from '../../../hooks/useLexicon';
import { useTheme } from '../../../hooks/useTheme';

export default function ParentTabsLayout() {
  const { t } = useLexicon();
  const { palette } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette['accent-info'],
        tabBarInactiveTintColor: palette['text-muted'],
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.surface,
          borderTopWidth: 1,
          paddingTop: 6,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_home'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant-outline" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chores"
        options={{
          title: t('quest_plural'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="sword-cross" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: t('loot'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="treasure-chest" size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: t('guild'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group-outline" size={size ?? 24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
