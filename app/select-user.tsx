import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore, USER_A_ID, USER_B_ID } from '../store/userStore';
import { colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function UserSelection() {
  const { setUser } = useUserStore();
  const router = useRouter();

  const handleSelect = (id: string) => {
    setUser(id);
    router.replace('/tasks');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to ProcrastiNO</Text>
          <Text style={styles.subtitle}>Who are you today?</Text>
        </View>

        <View style={styles.options}>
          <Pressable 
            style={({ pressed }) => [styles.optionCard, pressed && styles.pressed]}
            onPress={() => handleSelect(USER_A_ID)}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
              <Ionicons name="person" size={32} color="#FFF" />
            </View>
            <Text style={styles.optionTitle}>Me (User 1)</Text>
            <Text style={styles.optionDesc}>I will track my daily goals here.</Text>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.optionCard, pressed && styles.pressed]}
            onPress={() => handleSelect(USER_B_ID)}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.accentMint }]}>
              <Ionicons name="person" size={32} color="#FFF" />
            </View>
            <Text style={styles.optionTitle}>Partner (User 2)</Text>
            <Text style={styles.optionDesc}>I will track my daily goals here.</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This choice will be saved on this device.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  options: {
    gap: 20,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  optionDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
