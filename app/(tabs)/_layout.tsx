import React, { memo, useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type PressableStateCallbackType,
} from 'react-native';
import { colors } from '../../constants/colors';

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
        name="profile"
        options={{
          title: 'Profile',
          tabBarButton: (props) => (
            <PremiumTabButton
              {...props}
              activeIcon="person-circle"
              inactiveIcon="person-circle-outline"
              accentColor={colors.accentMint}
            />
          ),
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
});
