import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useUserStore, RAKSHIT_ID, SNEH_ID } from '../store/userStore';
import { colors } from '../constants/colors';

const LOGO = require('../assets/Logo.png');

type ProfileCardProps = {
  accent: string;
  avatarUri?: string;
  delay: number;
  isActive: boolean;
  isDimmed: boolean;
  isLoading: boolean;
  label: string;
  letter: string;
  onPress: () => void;
};

function ProfileCard({
  accent,
  avatarUri,
  delay,
  isActive,
  isDimmed,
  isLoading,
  label,
  letter,
  onPress,
}: ProfileCardProps) {
  const entrance = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const activeProgress = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 560,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, entrance]);

  React.useEffect(() => {
    Animated.spring(activeProgress, {
      toValue: isActive ? 1 : 0,
      speed: 20,
      bounciness: 7,
      useNativeDriver: true,
    }).start();
  }, [activeProgress, isActive]);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.97,
      speed: 25,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      speed: 20,
      bounciness: 8,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardShell,
        {
          opacity: entrance.interpolate({
            inputRange: [0, 1],
            outputRange: [0, isDimmed ? 0.42 : 1],
          }),
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
            {
              scale: Animated.multiply(
                pressScale,
                activeProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.03],
                })
              ),
            },
          ],
        },
      ]}
    >
      <Pressable
        disabled={isLoading}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardPressable}
      >
        <Animated.View
          style={[
            styles.profileCard,
            {
              borderColor: isActive ? `${accent}66` : 'rgba(205, 191, 168, 0.36)',
              shadowColor: accent,
              transform: [
                {
                  translateY: activeProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -4],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.cardGlowWrap}>
            <Animated.View
              style={[
                styles.cardGlow,
                {
                  backgroundColor: accent,
                  opacity: activeProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.16],
                  }),
                },
              ]}
            />
          </View>

          <View style={[styles.avatarBox, { backgroundColor: accent }]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarLetter}>{letter}</Text>
            )}
          </View>

          <Text style={styles.name}>{label}</Text>
          <Text style={styles.subtitle}>Tap to continue</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function UserSelection() {
  const { setUser, profilePics } = useUserStore();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayScale = useRef(new Animated.Value(0.98)).current;

  const profiles = useMemo(
    () => [
      {
        id: RAKSHIT_ID,
        label: 'Rakshit',
        letter: 'R',
        accent: colors.accent,
      },
      {
        id: SNEH_ID,
        label: 'Sneh',
        letter: 'S',
        accent: '#F2A6A0',
      },
    ],
    []
  );

  const handleSelect = async (id: string) => {
    if (loadingId) return;

    setLoadingId(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(overlayScale, {
        toValue: 1,
        speed: 18,
        bounciness: 5,
        useNativeDriver: true,
      }),
    ]).start();

    await new Promise((resolve) => setTimeout(resolve, 170));
    await setUser(id);
    router.replace('/tasks');
  };

  const selectedProfile = profiles.find((profile) => profile.id === loadingId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundOrbTop} />
      <View style={styles.backgroundOrbBottom} />

      <View style={styles.content}>
        <Animated.View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.title}>
            Pick your profile to jump straight into today&apos;s tasks.
          </Text>
        </Animated.View>

        <View style={styles.profileContainer}>
          {profiles.map((profile, index) => (
            <ProfileCard
              key={profile.id}
              accent={profile.accent}
              avatarUri={profilePics[profile.id]}
              delay={index * 110}
              isActive={loadingId === profile.id}
              isDimmed={Boolean(loadingId && loadingId !== profile.id)}
              isLoading={Boolean(loadingId)}
              label={profile.label}
              letter={profile.letter}
              onPress={() => handleSelect(profile.id)}
            />
          ))}
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            Your last selected profile stays signed in automatically.
          </Text>
        </View>
      </View>

      {loadingId && selectedProfile ? (
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.loadingOverlay,
            {
              opacity: overlayOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.loadingCard,
              {
                transform: [{ scale: overlayScale }],
              },
            ]}
          >
            <View
              style={[
                styles.loadingAvatar,
                { backgroundColor: selectedProfile.accent },
              ]}
            >
              {profilePics[selectedProfile.id] ? (
                <Image
                  source={{ uri: profilePics[selectedProfile.id] }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarLetter}>{selectedProfile.letter}</Text>
              )}
            </View>
            <Text style={styles.loadingTitle}>Opening {selectedProfile.label}</Text>
            <Text style={styles.loadingText}>Syncing your workspace...</Text>
            <ActivityIndicator
              size="small"
              color={selectedProfile.accent}
              style={styles.loadingSpinner}
            />
          </Animated.View>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF7F0',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  backgroundOrbTop: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(168,154,230,0.14)',
  },
  backgroundOrbBottom: {
    position: 'absolute',
    bottom: 40,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(93,202,165,0.1)',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#C7B89F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 8,
    marginBottom: 18,
  },
  logo: {
    width: 54,
    height: 54,
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.45,
    color: colors.textPrimary,
    lineHeight: 33,
    textAlign: 'center',
    maxWidth: 320,
  },
  profileContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  cardShell: {
    width: 156,
    maxWidth: '48%',
  },
  cardPressable: {
    borderRadius: 30,
  },
  profileCard: {
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 6,
  },
  cardGlowWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
  },
  cardGlow: {
    position: 'absolute',
    top: -34,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarBox: {
    width: 92,
    height: 92,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#B7A78E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footerNote: {
    marginTop: 28,
    alignItems: 'center',
  },
  footerNoteText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(250, 245, 236, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 30,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 22,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
    shadowColor: '#B7A78E',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 10,
  },
  loadingAvatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingSpinner: {
    marginTop: 18,
  },
});
