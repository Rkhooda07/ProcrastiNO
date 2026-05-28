import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Dimensions, Modal, SafeAreaView, ActivityIndicator, Animated, Platform, PanResponder, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { BlurView } from 'expo-blur';
import { useWorkoutStore } from '../../store/workoutStore';

const { width, height } = Dimensions.get('window');

const MOTIVATIONAL_QUOTES = [
  "Believe in yourself and all that you are.",
  "Your only limit is you.",
  "Push harder than yesterday if you want a different tomorrow.",
  "The only bad workout is the one that didn't happen.",
  "Success starts with self-discipline.",
  "Don't stop when you're tired. Stop when you're done.",
  "Great things never come from comfort zones."
];

interface Exercise {
  name: string;
  duration: number; // in seconds
  image: string;
}

interface Workout {
  id: string;
  title: string;
  description: string;
  duration: string;
  image: string;
  exercises: Exercise[];
}

const WORKOUTS: Workout[] = [
  {
    id: '4',
    title: 'Core Shredder',
    description: 'Targeted core exercises for weight loss and abdominal definition.',
    duration: '30 min',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&auto=format&fit=crop',
    exercises: [
      { name: 'Crunches', duration: 45, image: 'https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f?q=80&w=400&auto=format&fit=crop' },
      { name: 'Leg Raises', duration: 45, image: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?q=80&w=400&auto=format&fit=crop' },
      { name: 'Plank Jacks', duration: 45, image: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?q=80&w=400&auto=format&fit=crop' },
      { name: 'Russian Twists', duration: 45, image: 'https://images.unsplash.com/photo-1599058917233-358368395ff6?q=80&w=400&auto=format&fit=crop' },
    ]
  },
  {
    id: '1',
    title: 'Cardio Blast',
    description: 'High-intensity cardio to get your heart racing and burn calories fast.',
    duration: '30 min',
    image: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?q=80&w=600&auto=format&fit=crop',
    exercises: [
      { name: 'Jumping Jacks', duration: 45, image: 'https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f?q=80&w=400&auto=format&fit=crop' },
      { name: 'Mountain Climbers', duration: 45, image: 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?q=80&w=400&auto=format&fit=crop' },
      { name: 'High Knees', duration: 45, image: 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?q=80&w=400&auto=format&fit=crop' },
      { name: 'Burpees', duration: 30, image: 'https://images.unsplash.com/photo-1599058917233-358368395ff6?q=80&w=400&auto=format&fit=crop' },
    ]
  },
  {
    id: '2',
    title: 'Full Body Sculpt',
    description: 'A comprehensive workout targeting every major muscle group for total body definition.',
    duration: '30 min',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop',
    exercises: [
      { name: 'Pushups', duration: 40, image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=400&auto=format&fit=crop' },
      { name: 'Squats', duration: 40, image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2158?q=80&w=400&auto=format&fit=crop' },
      { name: 'Lunges', duration: 40, image: 'https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?q=80&w=400&auto=format&fit=crop' },
      { name: 'Plank', duration: 60, image: 'https://images.unsplash.com/photo-1566241134883-13eb2393a3cc?q=80&w=400&auto=format&fit=crop' },
    ]
  },
  {
    id: '3',
    title: 'Pure Calisthenics',
    description: 'Master your own body weight with these classic strength-building movements.',
    duration: '30 min',
    image: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=600&auto=format&fit=crop',
    exercises: [
      { name: 'Pull Ups', duration: 30, image: 'https://images.unsplash.com/photo-1598575419181-98bb2955ec89?q=80&w=400&auto=format&fit=crop' },
      { name: 'Dips', duration: 30, image: 'https://images.unsplash.com/photo-1591948970421-14b98694671c?q=80&w=400&auto=format&fit=crop' },
      { name: 'Chin Ups', duration: 30, image: 'https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f?q=80&w=400&auto=format&fit=crop' },
      { name: 'Pushups', duration: 45, image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=400&auto=format&fit=crop' },
    ]
  }
];

export default function WorkoutScreen() {
  const { saveProgress, clearProgress, getProgress } = useWorkoutStore();
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'preview' | 'countdown' | 'active' | 'completed'>('preview');
  const [countdown, setCountdown] = useState(3);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [randomQuote, setRandomQuote] = useState("");
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [pendingSavedWorkout, setPendingSavedWorkout] = useState<any>(null);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isExitingRef = useRef(false);
  const countdownScale = useRef(new Animated.Value(0)).current;
  const countdownOpacity = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dx) < 30;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          pan.y.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          handleExitSession();
        } else {
          Animated.spring(pan.y, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  const handleExitSession = () => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;

    if (selectedWorkout && sessionStatus === 'active') {
      saveProgress({
        workoutId: selectedWorkout.id,
        exerciseIndex: currentExerciseIndex,
        timeLeft: timeLeft,
        isResting: isResting,
        lastUpdated: new Date().toISOString()
      });
    }
    
    Animated.timing(pan.y, {
      toValue: height,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      // 1. Hide modal first
      setIsSessionActive(false);
      
      // 2. Delay state cleanup slightly to ensure modal has unmounted
      // This prevents the 'blink' caused by the UI clearing while modal is still visible
      setTimeout(() => {
        setSessionStatus('preview');
        setSelectedWorkout(null);
        setShowResumePrompt(false);
        if (timerRef.current) clearInterval(timerRef.current);
        pan.y.setValue(0);
        isExitingRef.current = false;
      }, 100);
    });
  };

  const startWorkout = (workout: Workout) => {
    const saved = getProgress(workout.id);
    setSelectedWorkout(workout);
    pan.setValue({ x: 0, y: 0 });
    isExitingRef.current = false;
    
    if (saved) {
      setPendingSavedWorkout(saved);
      setShowResumePrompt(true);
    } else {
      setSessionStatus('preview');
      setCurrentExerciseIndex(0);
    }
    
    // Open modal AFTER state is set to avoid initial 'blink'
    setIsSessionActive(true);
  };

  const handleResume = () => {
    if (pendingSavedWorkout) {
      setSessionStatus('active');
      setCurrentExerciseIndex(pendingSavedWorkout.exerciseIndex);
      setTimeLeft(pendingSavedWorkout.timeLeft);
      setIsResting(pendingSavedWorkout.isResting);
    }
    setShowResumePrompt(false);
    setPendingSavedWorkout(null);
  };

  const handleStartOver = () => {
    if (selectedWorkout) clearProgress(selectedWorkout.id);
    setSessionStatus('preview');
    setCurrentExerciseIndex(0);
    setShowResumePrompt(false);
    setPendingSavedWorkout(null);
  };

  const beginCountdown = () => {
    setSessionStatus('countdown');
    setCountdown(3);
    animateCountdown();
  };

  const animateCountdown = () => {
    countdownScale.setValue(0);
    countdownOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(countdownScale, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
      Animated.timing(countdownOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const startActiveSession = () => {
    if (!selectedWorkout) return;
    setSessionStatus('active');
    setTimeLeft(selectedWorkout.exercises[0].duration);
    setIsResting(false);
  };

  useEffect(() => {
    if (sessionStatus === 'countdown') {
      const cdTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(cdTimer);
            startActiveSession();
            return 0;
          }
          animateCountdown();
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(cdTimer);
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (isSessionActive && sessionStatus === 'active' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isSessionActive && sessionStatus === 'active' && timeLeft === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      
      if (!isResting) {
        setIsResting(true);
        setTimeLeft(15);
      } else {
        const nextIndex = currentExerciseIndex + 1;
        if (selectedWorkout && nextIndex < selectedWorkout.exercises.length) {
          setCurrentExerciseIndex(nextIndex);
          setIsResting(false);
          setTimeLeft(selectedWorkout.exercises[nextIndex].duration);
        } else {
          if (selectedWorkout) clearProgress(selectedWorkout.id);
          setRandomQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
          setSessionStatus('completed');
        }
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSessionActive, timeLeft, isResting, currentExerciseIndex, selectedWorkout, sessionStatus]);

  const renderWorkoutCard = (workout: Workout) => (
    <Pressable key={workout.id} style={styles.card} onPress={() => startWorkout(workout)}>
      <Image source={{ uri: workout.image }} style={styles.thumbnail} />
      <View style={styles.cardInfo}>
        <View style={styles.badgeContainer}>
          <View style={styles.badge}><Text style={styles.badgeText}>30 MINS</Text></View>
          <Text style={styles.duration}>Intermediate</Text>
        </View>
        <Text style={styles.cardTitle}>{workout.title}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>{workout.description}</Text>
      </View>
      <View style={styles.playIconContainer}><Ionicons name="play" size={24} color="#FFF" /></View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Time to move,</Text>
          <Text style={styles.title}>Daily Workout</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pick a Session</Text>
          {WORKOUTS.map(workout => renderWorkoutCard(workout))}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      <Modal 
        visible={isSessionActive} 
        animationType="none" 
        transparent={true}
        onRequestClose={handleExitSession}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            style={[
              styles.sessionContainer,
              { transform: [{ translateY: pan.y }] }
            ]}
            {...panResponder.panHandlers}
          >
            {showResumePrompt ? (
              <View style={styles.resumePromptContent}>
                <View style={styles.resumeCard}>
                  <View style={styles.resumeIconContainer}>
                    <Ionicons name="refresh-circle" size={60} color={colors.accent} />
                  </View>
                  <Text style={styles.resumeTitle}>Resume?</Text>
                  <Text style={styles.resumeDescription}>
                    Pick up where you left off or start fresh?
                  </Text>
                  <View style={styles.resumeActions}>
                    <Pressable style={[styles.resumeBtn, styles.resumeBtnPrimary]} onPress={handleResume}>
                      <Text style={styles.resumeBtnTextPrimary}>Resume</Text>
                    </Pressable>
                    <Pressable style={[styles.resumeBtn, styles.resumeBtnSecondary]} onPress={handleStartOver}>
                      <Text style={styles.resumeBtnTextSecondary}>Start Over</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              <SafeAreaView style={styles.workoutContent}>
                {selectedWorkout && (
                  <>
                    <View style={styles.sessionHeader}>
                      <Pressable onPress={handleExitSession} style={styles.closeBtn}>
                        <Ionicons name="close-circle" size={32} color={colors.textPrimary} />
                      </Pressable>
                      <View style={styles.sessionTitleContainer}>
                        <Text style={styles.sessionTitle}>{selectedWorkout.title}</Text>
                        <Text style={styles.sessionSubtitle}>Day 1 • 30 mins</Text>
                      </View>
                      <View style={{ width: 40 }} />
                    </View>

                    {sessionStatus === 'preview' && (
                      <View style={styles.previewContent}>
                        <Image source={{ uri: selectedWorkout.image }} style={styles.previewImage} />
                        <Text style={styles.previewTitle}>Get Ready!</Text>
                        <Text style={styles.previewDescription}>{selectedWorkout.description}</Text>
                        <View style={styles.previewMeta}>
                          <View style={styles.metaItem}><Ionicons name="time-outline" size={20} color={colors.accent} /><Text style={styles.metaText}>30 Mins</Text></View>
                          <View style={styles.metaItem}><Ionicons name="flame-outline" size={20} color={colors.streakOrange} /><Text style={styles.metaText}>350 kcal</Text></View>
                        </View>
                        <Pressable style={styles.startWorkoutBtn} onPress={beginCountdown}><Text style={styles.startWorkoutBtnText}>Start Workout</Text></Pressable>
                      </View>
                    )}

                    {sessionStatus === 'countdown' && (
                      <View style={styles.countdownContent}>
                        <Animated.Text style={[styles.countdownNumber, { opacity: countdownOpacity, transform: [{ scale: countdownScale }] }]}>{countdown}</Animated.Text>
                        <Text style={styles.countdownLabel}>GET READY</Text>
                      </View>
                    )}

                    {sessionStatus === 'active' && (
                      <>
                        <View style={styles.exerciseContent}>
                          <View style={styles.imageContainer}>
                            <Image source={{ uri: isResting ? 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=600&auto=format&fit=crop' : selectedWorkout.exercises[currentExerciseIndex].image }} style={styles.exerciseImage} />
                            {isResting && <View style={styles.restOverlay}><Text style={styles.restText}>REST</Text></View>}
                          </View>
                          <View style={styles.timerContainer}>
                            <Text style={styles.timerLabel}>{isResting ? 'Get Ready For' : selectedWorkout.exercises[currentExerciseIndex].name}</Text>
                            <Text style={[styles.timeLeft, isResting && { color: colors.accentMint }]}>{timeLeft}s</Text>
                          </View>
                          <View style={styles.progressContainer}>
                            <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${((currentExerciseIndex + (isResting ? 0.5 : 0)) / selectedWorkout.exercises.length) * 100}%` }]} /></View>
                            <Text style={styles.progressText}>Exercise {currentExerciseIndex + 1} of {selectedWorkout.exercises.length}</Text>
                          </View>
                        </View>
                        <View style={styles.sessionFooter}>
                          <BlurView intensity={20} tint="light" style={styles.footerBlur}>
                            <View style={styles.nextUp}>
                              <Text style={styles.nextLabel}>NEXT UP</Text>
                              <Text style={styles.nextExercise}>{currentExerciseIndex + 1 < selectedWorkout.exercises.length ? selectedWorkout.exercises[currentExerciseIndex + 1].name : 'Workout Complete!'}</Text>
                            </View>
                            <Ionicons name={currentExerciseIndex + 1 < selectedWorkout.exercises.length ? "arrow-forward" : "checkmark-done"} size={24} color={colors.accent} />
                          </BlurView>
                        </View>
                      </>
                    )}

                    {sessionStatus === 'completed' && (
                      <View style={styles.completedContent}>
                        <View style={styles.trophyContainer}>
                          <Ionicons name="trophy" size={100} color="#FFD700" />
                          <View style={styles.sparkleContainer}><Ionicons name="sparkles" size={40} color="#FFD700" /></View>
                        </View>
                        <Text style={styles.completedTitle}>CONGRATULATIONS!</Text>
                        <Text style={styles.completedSubtitle}>You smashed that workout!</Text>
                        <View style={styles.quoteCard}>
                          <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.accent} style={{ marginBottom: 12 }} />
                          <Text style={styles.quoteText}>{randomQuote}</Text>
                        </View>
                        <Pressable style={styles.finishBtn} onPress={handleExitSession}><Text style={styles.finishBtnText}>Finish</Text></Pressable>
                      </View>
                    )}
                  </>
                )}
              </SafeAreaView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingTop: 20 },
  header: { paddingHorizontal: 20, marginBottom: 24 },
  greeting: { fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
  title: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 24, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
  thumbnail: { width: '100%', height: 180, backgroundColor: colors.border },
  cardInfo: { padding: 20 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  badge: { backgroundColor: `${colors.accent}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 10 },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.accent },
  duration: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  cardTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  cardDescription: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  playIconContainer: { position: 'absolute', right: 20, bottom: 80, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  sessionContainer: { 
    flex: 1, 
    backgroundColor: 'transparent',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  workoutContent: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', 
  },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 80 },
  sessionTitleContainer: { alignItems: 'center' },
  sessionSubtitle: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sessionTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  exerciseContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  imageContainer: { width: width - 60, height: width - 60, borderRadius: 40, overflow: 'hidden', backgroundColor: colors.border, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 20, marginBottom: 40 },
  exerciseImage: { width: '100%', height: '100%' },
  restOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  restText: { fontSize: 48, fontWeight: '900', color: colors.accentMint, letterSpacing: 4 },
  timerContainer: { alignItems: 'center', marginBottom: 40 },
  timerLabel: { fontSize: 20, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textAlign: 'center' },
  timeLeft: { fontSize: 84, fontWeight: '900', color: colors.accent, fontVariant: ['tabular-nums'] },
  progressContainer: { width: '100%', alignItems: 'center' },
  progressBar: { width: '100%', height: 10, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 5, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 5 },
  progressText: { fontSize: 14, color: colors.textSecondary, fontWeight: '700' },
  sessionFooter: { paddingHorizontal: 20, paddingBottom: 40 },
  footerBlur: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderRadius: 30, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  nextUp: { flex: 1 },
  nextLabel: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1.5, marginBottom: 4 },
  nextExercise: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  previewContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  previewImage: { width: width - 80, height: 240, borderRadius: 30, marginBottom: 30 },
  previewTitle: { fontSize: 32, fontWeight: '900', color: colors.textPrimary, marginBottom: 10 },
  previewDescription: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  previewMeta: { flexDirection: 'row', gap: 20, marginBottom: 40 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  metaText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  startWorkoutBtn: { backgroundColor: colors.accent, width: '100%', height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 },
  startWorkoutBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  countdownContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  countdownNumber: { fontSize: 160, fontWeight: '900', color: colors.accent },
  countdownLabel: { fontSize: 20, fontWeight: '800', color: colors.textSecondary, letterSpacing: 4, marginTop: -20 },
  completedContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  trophyContainer: { marginBottom: 40, alignItems: 'center' },
  sparkleContainer: { position: 'absolute', top: -20, right: -20 },
  completedTitle: { fontSize: 28, fontWeight: '900', color: colors.textPrimary, marginBottom: 10 },
  completedSubtitle: { fontSize: 18, color: colors.textSecondary, fontWeight: '600', marginBottom: 40 },
  quoteCard: { backgroundColor: colors.surface, padding: 30, borderRadius: 24, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 40 },
  quoteText: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, textAlign: 'center', fontStyle: 'italic', lineHeight: 26 },
  finishBtn: { backgroundColor: colors.accent, width: '100%', height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  finishBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  resumePromptContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  resumeCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 24, width: '90%', alignItems: 'center', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  resumeIconContainer: { marginBottom: 16 },
  resumeTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, marginBottom: 8 },
  resumeDescription: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  resumeActions: { width: '100%', gap: 12 },
  resumeBtn: { width: '100%', height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  resumeBtnPrimary: { backgroundColor: colors.accent },
  resumeBtnSecondary: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  resumeBtnTextPrimary: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  resumeBtnTextSecondary: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' }
});
