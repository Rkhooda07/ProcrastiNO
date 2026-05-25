import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useUserStore } from '../../store/userStore';
import { useTaskStore } from '../../store/taskStore';
import { colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { currentUserId, partnerId } = useUserStore();
  const { tasks } = useTaskStore();
  const [stats, setStats] = useState<any>(null);
  const [partnerStats, setPartnerStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (currentUserId) {
      fetchStats();
    }
  }, [currentUserId, partnerId]);

  async function fetchStats() {
    setLoading(true);
    const { data: myStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', currentUserId)
      .single();

    if (myStats) setStats(myStats);

    if (partnerId) {
      const { data: pStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', partnerId)
        .single();
      if (pStats) setPartnerStats(pStats);
    }
    setLoading(false);
  }

  const myTasksToday = tasks.filter(t => t.owner_id === currentUserId);
  const myCompletedToday = myTasksToday.filter(t => t.is_done).length;
  const myProgress = myTasksToday.length > 0 ? myCompletedToday / myTasksToday.length : 0;

  const partnerTasksToday = tasks.filter(t => t.owner_id === partnerId);
  const partnerCompletedToday = partnerTasksToday.filter(t => t.is_done).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>P</Text>
          </View>
          <Text style={styles.userName}>{currentUserId === 'user-alpha-unique-id' ? 'User 1' : 'User 2'}</Text>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={20} color={colors.streakOrange} />
            <Text style={styles.streakText}>{stats?.streak_count || 0}-day streak</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Progress</Text>
          <Text style={styles.progressText}>{myCompletedToday}/{myTasksToday.length} tasks done</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${myProgress * 100}%` }]} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partner's Status</Text>
          <View style={[styles.card, styles.partnerCard]}>
            <View style={styles.partnerInfo}>
              <View style={styles.partnerAvatar}>
                <Ionicons name="person" size={20} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.partnerName}>Your Partner</Text>
                <Text style={styles.partnerStreak}>{partnerStats?.streak_count || 0}-day streak</Text>
              </View>
            </View>
            <View style={styles.partnerProgress}>
               <Text style={styles.partnerProgressText}>{partnerCompletedToday}/{partnerTasksToday.length} today</Text>
            </View>
          </View>
        </View>

        <View style={styles.menu}>
          <Link href="/profile/reminders" asChild>
            <Pressable style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
                <Text style={styles.menuItemText}>Reminders</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          </Link>

          <Pressable 
            style={[styles.menuItem, { borderBottomWidth: 0 }]} 
            onPress={() => {
              const { resetUser } = useUserStore.getState();
              resetUser();
              router.replace('/select-user');
            }}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="swap-horizontal-outline" size={22} color={colors.accent} />
              <Text style={[styles.menuItemText, { color: colors.accent }]}>Switch Profile</Text>
            </View>
          </Pressable>
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
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  streakText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.streakOrange,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accentMint,
    borderRadius: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    marginLeft: 4,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  partnerStreak: {
    fontSize: 12,
    color: colors.streakOrange,
    fontWeight: '500',
  },
  partnerProgress: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  partnerProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});
