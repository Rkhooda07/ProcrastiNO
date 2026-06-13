import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useUserStore } from '../../store/userStore';
import { useTaskStore } from '../../store/taskStore';
import { colors } from '../../constants/colors';
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
  const { currentUserId, currentUserName, profilePics, uploadProfilePic } = useUserStore();
  const { tasks, completedDates, fetchStreakData } = useTaskStore();
  const [loading, setLoading] = useState(true);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  useEffect(() => {
    if (currentUserId) {
      loadData();
    }
  }, [currentUserId]);

  async function loadData() {
    setLoading(true);
    await fetchStreakData(currentUserId!);
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
      const asset = result.assets[0];
      setIsSavingPhoto(true);
      await uploadProfilePic(currentUserId, asset.uri, asset.mimeType).catch((error) => {
        console.warn('Failed to sync profile picture', error);
      });
      setIsSavingPhoto(false);
    }
  };

  const myTasksToday = tasks.filter(t => t.owner_id === currentUserId);
  const myCompletedToday = myTasksToday.filter(t => t.is_done).length;
  const myProgress = myTasksToday.length > 0 ? myCompletedToday / myTasksToday.length : 0;

  const myStreak = calculateStreak(completedDates);

  const myPfp = currentUserId ? profilePics[currentUserId] : null;

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
              {isSavingPhoto ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="camera" size={14} color="#FFF" />
              )}
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

        <View style={styles.menu}>
          <Link href="/profile/reminders" asChild>
            <Pressable style={styles.menuItemLast}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
                <Text style={styles.menuItemText}>Reminders</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          </Link>
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
  menuItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 0,
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
