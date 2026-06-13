import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type PressableStateCallbackType,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import * as Haptics from 'expo-haptics';
import { useTaskStore } from '../../store/taskStore';
import { useUserStore } from '../../store/userStore';
import { colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

type TabIconName = keyof typeof Ionicons.glyphMap;

type PremiumTabButtonProps = PressableProps & {
  accessibilityState?: {
    selected?: boolean;
  };
  activeIcon: TabIconName;
  inactiveIcon: TabIconName;
  accentColor: string;
};

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
      const prev = new Date(sorted[i - 1]);
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

const PremiumTabButton = memo(function PremiumTabButton({
  accessibilityState,
  activeIcon,
  inactiveIcon,
  accentColor,
  onPressIn,
  onPressOut,
  style,
  ...props
}: PremiumTabButtonProps) {
  const focused = Boolean(accessibilityState?.selected);
  const activeScale = useRef(new Animated.Value(focused ? 1 : 0.94)).current;
  const activeLift = useRef(new Animated.Value(focused ? -2 : 0)).current;
  const activeGlow = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(activeScale, {
        toValue: focused ? 1 : 0.94,
        useNativeDriver: true,
        speed: 22,
        bounciness: 7,
      }),
      Animated.spring(activeLift, {
        toValue: focused ? -2 : 0,
        useNativeDriver: true,
        speed: 22,
        bounciness: 6,
      }),
      Animated.timing(activeGlow, {
        toValue: focused ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeGlow, activeLift, activeScale, focused]);

  const handlePressIn: PremiumTabButtonProps['onPressIn'] = (event) => {
    Animated.spring(pressScale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();
    onPressIn?.(event);
  };

  const handlePressOut: PremiumTabButtonProps['onPressOut'] = (event) => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 10,
    }).start();
    onPressOut?.(event);
  };

  return (
    <Pressable
      {...props}
      android_ripple={null}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={(state: PressableStateCallbackType) => [
        styles.tabPressable,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <Animated.View
        style={[
          styles.tabButtonOuter,
          {
            transform: [{ translateY: activeLift }, { scale: activeScale }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.tabActiveHalo,
            {
              backgroundColor: accentColor,
              opacity: activeGlow.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.18],
              }),
              transform: [
                {
                  scale: activeGlow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.82, 1],
                  }),
                },
              ],
            },
          ]}
        />
          <Animated.View
            style={[
              styles.tabButtonInner,
              {
                transform: [{ scale: pressScale }],
                borderColor: focused ? `${accentColor}33` : 'rgba(165, 149, 122, 0.12)',
                backgroundColor: focused ? 'rgba(255,253,248,0.82)' : 'rgba(255,248,238,0.64)',
              },
            ]}
          >
          <View
            style={[
              styles.tabIconPlate,
              {
                backgroundColor: focused ? `${accentColor}20` : 'rgba(255,252,246,0.72)',
              },
            ]}
          >
            <Ionicons
              name={focused ? activeIcon : inactiveIcon}
              size={22}
              color={focused ? accentColor : colors.textSecondary}
            />
          </View>
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                backgroundColor: accentColor,
                opacity: activeGlow,
                transform: [
                  {
                    scaleX: activeGlow.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
});

function HeaderActions({ showProfile = true }: { showProfile?: boolean }) {
  const router = useRouter();
  const { currentUserId, currentUserName } = useUserStore();
  const { completedDates, fetchStreakData } = useTaskStore();
  const [showCalendar, setShowCalendar] = useState(false);

  const currentStreak = useMemo(() => calculateStreak(completedDates), [completedDates]);

  const markedDates = useMemo(() => {
    const dates: Record<string, any> = {};
    completedDates.forEach((date) => {
      dates[date] = {
        selected: true,
        selectedColor: colors.accentMint,
        customStyles: { container: { borderRadius: 8 } },
      };
    });
    return dates;
  }, [completedDates]);

  useEffect(() => {
    if (currentUserId) {
      void fetchStreakData(currentUserId);
    }
  }, [currentUserId, fetchStreakData]);

  return (
    <View style={styles.headerActions}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowCalendar(true);
        }}
        style={styles.streakButton}
      >
        <Text style={styles.streakButtonText}>{currentStreak}</Text>
        <Ionicons name="flame" size={26} color={colors.streakOrange} />
      </Pressable>
      {showProfile && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.navigate('/profile');
          }}
          style={styles.headerProfileButton}
        >
          <Ionicons name="person-circle" size={30} color={colors.accentMint} />
        </Pressable>
      )}

      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowCalendar(false)}
      >
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
          <Pressable style={styles.overlay} onPress={() => setShowCalendar(false)}>
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <Ionicons name="flame" size={32} color={colors.streakOrange} />
                <Text style={styles.calendarTitle}>{currentStreak} Day Streak!</Text>
                <Text style={styles.calendarSubtitle}>Keep it up, {currentUserName}!</Text>
              </View>
              <Calendar
                enableSwipeMonths={true}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#b6c1cd',
                  selectedDayBackgroundColor: colors.accentMint,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: colors.accent,
                  dayTextColor: '#2d4150',
                  textDisabledColor: '#d9e1e8',
                  dotColor: colors.accentMint,
                  selectedDotColor: '#ffffff',
                  arrowColor: colors.accent,
                  monthTextColor: colors.textPrimary,
                  textDayFontWeight: '600',
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: '500',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 13,
                }}
                markedDates={markedDates}
                style={styles.calendar}
              />
              <Pressable style={styles.closeBtn} onPress={() => setShowCalendar(false)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </BlurView>
      </Modal>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          height: Platform.OS === 'ios' ? 104 : 84,
          paddingTop: 0,
          paddingBottom: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarItemStyle: {
          paddingHorizontal: 6,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarBackground: () => (
          <View style={styles.tabBarBackground}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 48 : 64}
              tint="light"
              blurMethod={Platform.OS === 'android' ? 'none' : undefined}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.tabBarOverlay} />
          </View>
        ),
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.textPrimary,
        },
        headerRight: () => <HeaderActions />,
      }}
    >
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Today',
          tabBarButton: (props) => (
            <PremiumTabButton
              {...props}
              activeIcon="checkbox"
              inactiveIcon="checkbox-outline"
              accentColor={colors.accent}
            />
          ),
          headerTitle: 'ProcrastiNO',
          headerTitleStyle: {
            fontSize: 26,
            fontWeight: '900',
            color: colors.accent,
            letterSpacing: -1,
          },
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarButton: (props) => (
            <PremiumTabButton
              {...props}
              activeIcon="sparkles"
              inactiveIcon="sparkles-outline"
              accentColor="#F09A68"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarButton: (props) => (
            <PremiumTabButton
              {...props}
              activeIcon="barbell"
              inactiveIcon="barbell-outline"
              accentColor="#7C4DFF"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarButton: (props) => (
            <PremiumTabButton
              {...props}
              activeIcon="book"
              inactiveIcon="book-outline"
              accentColor={colors.accentMint}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: 'Profile',
          headerRight: () => <HeaderActions showProfile={false} />,
        }}
      />
      <Tabs.Screen
        name="profile/reminders"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? 16 : 12,
    marginBottom: Platform.OS === 'ios' ? 12 : 10,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 250, 240, 0.68)',
    shadowColor: '#9B8A6B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 14,
  },
  tabBarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(250,242,230,0.38)',
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 17,
    paddingBottom: 0,
  },
  tabButtonOuter: {
    width: 62,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActiveHalo: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  tabButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconPlate: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 5,
    width: 16,
    height: 3,
    borderRadius: 999,
  },
  headerActions: {
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  streakButtonText: {
    marginRight: 4,
    fontWeight: '800',
    color: colors.streakOrange,
    fontSize: 17,
  },
  headerProfileButton: {
    padding: 6,
    marginLeft: 2,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: '#FFF',
    width: width - 40,
    borderRadius: 32,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 20,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 8,
  },
  calendarSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  calendar: {
    width: width - 80,
    borderRadius: 16,
  },
  closeBtn: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderRadius: 16,
  },
  closeBtnText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
