import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useUserStore } from '../../store/userStore';
import { useTaskStore } from '../../store/taskStore';
import { colors } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const calculateStreak = (dates: string[]) => {
  if (!dates || dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (sorted[0] !== todayStr && sorted[0] !== yesterdayStr) return 0;
  
  let streak = 0;
  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i]);
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(sorted[i-1]);
      prev.setDate(prev.getDate() - 1);
      if (d.toISOString().split('T')[0] === prev.toISOString().split('T')[0]) {
        streak++;
      } else {
        break;
      }
    }
  }
  return streak;
};

export default function ProfileScreen() {
  const { currentUserId, partnerId, currentUserName, partnerName, profilePics, setProfilePic } = useUserStore();
  const { tasks, completedDates, fetchStreakData } = useTaskStore();
  const [partnerCompletedDates, setPartnerCompletedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (currentUserId) {
      loadData();
    }
  }, [currentUserId, partnerId]);

  async function loadData() {
    setLoading(true);
    await fetchStreakData(currentUserId!);
    if (partnerId) {
      const { data } = await supabase
        .from('tasks')
        .select('date, is_done')
        .eq('owner_id', partnerId);

      if (data) {
        const datesGrouped: { [key: string]: { total: number, done: number } } = {};
        data.forEach(t => {
          if (!datesGrouped[t.date]) datesGrouped[t.date] = { total: 0, done: 0 };
          datesGrouped[t.date].total++;
          if (t.is_done) datesGrouped[t.date].done++;
        });
        const completed = Object.keys(datesGrouped).filter(d => 
          datesGrouped[d].total > 0 && datesGrouped[d].total === datesGrouped[d].done
        );
        setPartnerCompletedDates(completed);
      }
    }
    setLoading(false);
  }

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && currentUserId) {
      setProfilePic(currentUserId, result.assets[0].uri);
    }
  };

  const myTasksToday = tasks.filter(t => t.owner_id === currentUserId);
  const myCompletedToday = myTasksToday.filter(t => t.is_done).length;
  const myProgress = myTasksToday.length > 0 ? myCompletedToday / myTasksToday.length : 0;

  const partnerTasksToday = tasks.filter(t => t.owner_id === partnerId);
  const partnerCompletedToday = partnerTasksToday.filter(t => t.is_done).length;
  const partnerProgress = partnerTasksToday.length > 0 ? partnerCompletedToday / partnerTasksToday.length : 0;

  const myStreak = calculateStreak(completedDates);
  const partnerStreak = calculateStreak(partnerCompletedDates);

  const myPfp = currentUserId ? profilePics[currentUserId] : null;
  const partnerPfp = partnerId ? profilePics[partnerId] : null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={pickImage} style={styles.pfpContainer}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: currentUserName === 'Rakshit' ? colors.accent : '#FFB7B2' }]}>
              {myPfp ? (
                <Image source={{ uri: myPfp }} style={styles.pfpImage} />
              ) : (
                <Text style={styles.avatarText}>{currentUserName?.charAt(0)}</Text>
              )}
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </View>
          </Pressable>
          <Text style={styles.userName}>{currentUserName}</Text>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={20} color={colors.streakOrange} />
            <Text style={styles.streakText}>{myStreak}-day streak</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Progress</Text>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>{myCompletedToday}/{myTasksToday.length} tasks done</Text>
            <Text style={styles.percentageText}>{Math.round(myProgress * 100)}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${myProgress * 100}%` }]} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partner's Status</Text>
          <View style={[styles.card, styles.partnerCard]}>
            <View style={styles.partnerInfo}>
              <View style={[styles.partnerAvatar, { backgroundColor: partnerName === 'Sneh' ? '#FFB7B2' : colors.accent }]}>
                {partnerPfp ? (
                   <Image source={{ uri: partnerPfp }} style={styles.partnerPfpImage} />
                ) : (
                  <Text style={styles.partnerAvatarText}>{partnerName?.charAt(0)}</Text>
                )}
              </View>
              <View>
                <Text style={styles.partnerName}>{partnerName}</Text>
                <View style={styles.partnerStreakRow}>
                  <Ionicons name="flame" size={14} color={colors.streakOrange} />
                  <Text style={styles.partnerStreak}>{partnerStreak}-day streak</Text>
                </View>
              </View>
            </View>
            <View style={styles.partnerProgressContainer}>
               <Text style={styles.partnerProgressText}>{partnerCompletedToday}/{partnerTasksToday.length} done</Text>
               <View style={styles.miniProgressBg}>
                 <View style={[styles.miniProgressFill, { width: `${partnerProgress * 100}%` }]} />
               </View>
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 132,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  pfpContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  pfpImage: {
    width: '100%',
    height: '100%',
  },
  partnerPfpImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.accent,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 44,
    fontWeight: '700',
    color: '#FFF',
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  streakText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: colors.streakOrange,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.accentMint,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: colors.background,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accentMint,
    borderRadius: 6,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
    marginLeft: 4,
    letterSpacing: -0.3,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  partnerAvatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  partnerName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  partnerStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  partnerStreak: {
    fontSize: 13,
    color: colors.streakOrange,
    fontWeight: '600',
    marginLeft: 4,
  },
  partnerProgressContainer: {
    alignItems: 'flex-end',
    width: 100,
  },
  partnerProgressText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  miniProgressBg: {
    width: '100%',
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: colors.accentMint,
    borderRadius: 3,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    marginLeft: 14,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
