import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, SafeAreaView, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useUserStore } from '../../../store/userStore';
import { useReminderStore } from '../../../store/reminderStore';
import { colors } from '../../../constants/colors';

export default function RemindersScreen() {
  const { currentUserId } = useUserStore();
  const { settings, isLoading, fetchSettings, updateSettings } = useReminderStore();
  const router = useRouter();

  useEffect(() => {
    if (currentUserId) {
      fetchSettings(currentUserId);
      requestPermissions();
    }
  }, [currentUserId]);

  async function requestPermissions() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
       // Handle permission denied
    }
  }

  const handleToggle = async (key: string, value: boolean) => {
    await updateSettings({ [key]: value });
    scheduleReminders({ ...settings!, [key]: value });
  };

  async function scheduleReminders(currentSettings: any) {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (currentSettings.water_enabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "💧 Water time!",
          body: "Stay hydrated — drink a glass of water",
        },
        trigger: {
          seconds: currentSettings.water_interval_min * 60,
          repeats: true,
        },
      });
    }

    if (currentSettings.posture_enabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🧘 Posture check",
          body: "Sit up straight and take a deep breath",
        },
        trigger: {
          seconds: currentSettings.posture_interval_min * 60,
          repeats: true,
        },
      });
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Reminders',
        headerLeft: () => (
          <Pressable onPress={() => router.back()} style={{ marginLeft: 10 }}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
        )
      }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Reminders</Text>
          <Text style={styles.sectionSubtitle}>
            Stay healthy and focused throughout your day with gentle nudges.
          </Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="water" size={20} color="#0EA5E9" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Water Intake</Text>
                  <Text style={styles.rowSubtitle}>Every {settings?.water_interval_min} minutes</Text>
                </View>
              </View>
              <Switch
                value={settings?.water_enabled}
                onValueChange={(val) => handleToggle('water_enabled', val)}
                trackColor={{ false: colors.border, true: colors.accentMint }}
                thumbColor="#FFF"
              />
            </View>

            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="accessibility" size={20} color="#22C55E" />
                </View>
                <View>
                  <Text style={styles.rowTitle}>Posture Check</Text>
                  <Text style={styles.rowSubtitle}>Every {settings?.posture_interval_min} minutes</Text>
                </View>
              </View>
              <Switch
                value={settings?.posture_enabled}
                onValueChange={(val) => handleToggle('posture_enabled', val)}
                trackColor={{ false: colors.border, true: colors.accentMint }}
                thumbColor="#FFF"
              />
            </View>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Reminders are scheduled locally on your device to ensure privacy and reliability.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
