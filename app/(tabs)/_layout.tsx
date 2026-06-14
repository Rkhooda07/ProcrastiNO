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
  Easing,
  type PressableProps,
  type PressableStateCallbackType,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '../../store/userStore';
import { useJournalStore } from '../../store/journalStore';
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

// Custom Day Component for refined highlighting
const CustomDay = memo(({ date, state, markedDates }: any) => {
  const dateStr = date.dateString;
  
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  const isToday = dateStr === todayStr;
  const isActive = markedDates[dateStr]?.selected;
  const isDisabled = state === 'disabled';

  return (
    <View style={styles.customDayContainer}>
      <View style={[
        styles.customDayCircle,
        (isActive && !isToday) && styles.activeDayCircle,
        isToday && styles.todayCircle,
      ]}>
        <Text style={[
          styles.customDayText,
          (isActive && !isToday) && styles.activeDayText,
          isToday && styles.todayDayText,
          isDisabled && styles.disabledDayText
        ]}>
          {date.day}
        </Text>
      </View>
    </View>
  );
});

// Memoized Calendar for zero-lag month switching
const MemoizedCalendar = memo(({ markedDates, theme, style }: any) => (
  <Calendar
    enableSwipeMonths={true}
    theme={theme}
    markedDates={markedDates}
    style={style}
    hideExtraDays={true}
    disableMonthChange={false}
    dayComponent={({ date, state }: any) => (
      <CustomDay date={date} state={state} markedDates={markedDates} />
    )}
  />
));

function HeaderActions({ showProfile = true }: { showProfile?: boolean }) {
  const router = useRouter();
  const { currentUserName } = useUserStore();
  const { streak, activeDates } = useJournalStore();
  const [showCalendar, setShowCalendar] = useState(false);
  const popoverAnim = useRef(new Animated.Value(0)).current;

  // Pre-calculate marked dates for instant rendering
  const markedDates = useMemo(() => {
    const dates: Record<string, any> = {};
    activeDates.forEach((date) => {
      dates[date] = {
        selected: true,
        selectedColor: colors.accentMint,
        customStyles: { container: { borderRadius: 8 } },
      };
    });
    return dates;
  }, [activeDates]);

  const toggleCalendar = () => {
    if (showCalendar) {
      Animated.timing(popoverAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => setShowCalendar(false));
    } else {
      setShowCalendar(true);
      Animated.spring(popoverAnim, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 1800, 
        damping: 100,
        mass: 0.8,
      }).start();
    }
  };

  const calendarTheme = useMemo(() => ({
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
    textDayFontSize: 14,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 12,
  }), []);

  return (
    <View style={styles.headerActions}>
      <Pressable
        onPress={toggleCalendar}
        style={({ pressed }) => [
          styles.streakButton,
          { opacity: pressed ? 0.7 : 1 }
        ]}
      >
        <Text style={styles.streakButtonText}>{streak}</Text>
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

      {showCalendar && (
        <Modal
          visible={showCalendar}
          transparent={true}
          animationType="none"
          onRequestClose={toggleCalendar}
          hardwareAccelerated={true}
        >
          <Pressable style={styles.modalOverlay} onPress={toggleCalendar}>
            <Animated.View
              style={[
                styles.popoverContainer,
                {
                  opacity: popoverAnim,
                  transform: [
                    {
                      scale: popoverAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.97, 1],
                      }),
                    },
                    {
                      translateY: popoverAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-8, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.popoverArrow} />
              <View style={styles.popoverContent}>
                <View style={styles.popoverHeader}>
                   <Text style={styles.popoverTitle}>{streak} Day Streak!</Text>
                   <Text style={styles.popoverSubtitle}>Keep it up, {currentUserName}!</Text>
                </View>
                <MemoizedCalendar
                  markedDates={markedDates}
                  theme={calendarTheme}
                  style={styles.popoverCalendar}
                />
              </View>
            </Animated.View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

export default function TabLayout() {
  const { markActive } = useJournalStore();

  useEffect(() => {
    // Synchronize streak on app load
    markActive();
  }, [markActive]);

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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  popoverContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    right: 20,
    width: width - 40,
    maxWidth: 340,
    backgroundColor: '#FFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  popoverArrow: {
    position: 'absolute',
    top: -10,
    right: 55,
    width: 20,
    height: 20,
    backgroundColor: '#FFF',
    transform: [{ rotate: '45deg' }],
    borderRadius: 4,
  },
  popoverContent: {
    padding: 16,
    overflow: 'hidden',
    borderRadius: 24,
  },
  popoverHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  popoverTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  popoverSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  popoverCalendar: {
    borderRadius: 12,
  },
  customDayContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  customDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeDayCircle: {
    backgroundColor: '#FFCC00', // Warm yellow fill for active days
    borderColor: '#FFCC00',
  },
  todayCircle: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFCC00',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customDayText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  activeDayText: {
    color: '#1C1C1E', // Dark text on yellow background
  },
  todayDayText: {
    color: '#2C2C2A',
    fontWeight: '800',
  },
  disabledDayText: {
    color: colors.textMuted,
  },
});
