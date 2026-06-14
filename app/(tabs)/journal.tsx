import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  Alert,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors } from '../../constants/colors';
import { useJournalStore, JournalEntry } from '../../store/journalStore';

const { width, height } = Dimensions.get('window');

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function JournalScreen() {
  const { entries, addEntry, updateEntry, deleteEntry, streak, activeDates, markActive } = useJournalStore();
  const [todayNote, setTodayNote] = useState('');
  const [greeting, setGreeting] = useState('GOOD MORNING');
  const [focusedMoment, setFocusedMoment] = useState<JournalEntry | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (focusedMoment) {
      Animated.spring(popAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }).start();
    } else {
      popAnim.setValue(0);
    }
  }, [focusedMoment]);

  useEffect(() => {
    // Delay markActive slightly to ensure navigation has stabilized
    const timer = setTimeout(() => {
      markActive();
    }, 100);
    
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('GOOD MORNING');
    else if (hour < 17) setGreeting('GOOD AFTERNOON');
    else setGreeting('GOOD EVENING');

    return () => clearTimeout(timer);
  }, []);

  // Get today's entries with images from the store
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todayEntries = entries
    .filter(e => new Date(e.date) >= todayStart && !!e.mediaUri);

  // Calculate current week dates starting from Monday
  const todayDate = new Date();
  const currentDay = todayDate.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = todayDate.getDate() - currentDay + (currentDay === 0 ? -6 : 1); 
  const monday = new Date(todayDate.getFullYear(), todayDate.getMonth(), diff);
  monday.setHours(0, 0, 0, 0);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const handleLaunchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera access to take photos!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled) {
      addEntry({ mediaUri: result.assets[0].uri, date: new Date().toISOString() });
    }
  };

  const handleDeleteMoment = () => {
    if (!focusedMoment) return;
    const id = focusedMoment.id;
    setFocusedMoment(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    deleteEntry(id);
  };

  const handleEditMoment = async () => {
    if (!focusedMoment) return;
    const id = focusedMoment.id;
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera access to take photos!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled) {
      updateEntry(id, { mediaUri: result.assets[0].uri });
      setFocusedMoment(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Simplified Header/Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.pageTitle}>Journal</Text>
        </View>

        {/* Streak Widget (Refined) */}
        <View style={styles.streakWidget}>
          <View style={styles.streakLeft}>
            <Ionicons name="flame" size={40} color={streak > 0 ? colors.streakOrange : colors.textMuted} />
            <Text style={styles.streakCountText}>
              <Text style={styles.streakNumber}>{streak}</Text> {streak === 1 ? 'DAY' : 'DAYS'}
            </Text>
          </View>
          <View style={styles.streakRight}>
            <Text style={styles.streakTitle}>Your streak</Text>
            <View style={styles.daysRow}>
              {DAYS.map((day, i) => {
                const dateObj = new Date(monday);
                dateObj.setDate(monday.getDate() + i);
                const dateVal = dateObj.getDate();
                
                const y = dateObj.getFullYear();
                const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                const d = String(dateObj.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${d}`;
                
                const todayObj = new Date();
                const ty = todayObj.getFullYear();
                const tm = String(todayObj.getMonth() + 1).padStart(2, '0');
                const td = String(todayObj.getDate()).padStart(2, '0');
                const todayStr = `${ty}-${tm}-${td}`;
                
                const isToday = dateStr === todayStr;
                const isFuture = dateObj > new Date();
                const isActive = activeDates.includes(dateStr);

                return (
                  <View key={i} style={styles.dayColumn}>
                    <View style={[
                      styles.dayCircle, 
                      (isActive && !isToday) && styles.activeDayCircle,
                      isToday && styles.todayCircle,
                    ]}>
                      <Text style={[
                        styles.dayDate, 
                        (isActive && !isToday) && styles.activeDateText,
                        isToday && styles.todayDateText,
                        isFuture && styles.futureDateText
                      ]}>{dateVal}</Text>
                    </View>
                    <Text style={styles.dayName}>{day}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Date Display */}
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <Text style={styles.todayTitle}>Today's Memories</Text>
        </View>

        {/* Snapchat Style Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll} contentContainerStyle={{ paddingRight: 40 }}>
          <TouchableOpacity style={styles.addCard} onPress={handleLaunchCamera}>
            <View style={styles.cameraCircle}>
              <Ionicons name="camera" size={32} color={colors.textSecondary} />
            </View>
            <Text style={styles.addCardText}>Capture</Text>
          </TouchableOpacity>

          {todayEntries.map((entry, index) => (
            <Pressable 
              key={entry.id} 
              style={styles.storyCard}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setFocusedMoment(entry);
              }}
            >
              <Image source={{ uri: entry.mediaUri }} style={styles.storyImage} />
              <View style={styles.storyOverlay}>
                <View style={styles.storyHeader}>
                   <View style={styles.storyBadge}>
                     <Ionicons name="star" size={10} color="#000" />
                   </View>
                </View>
                <Text style={styles.storyText}>Moment {index + 1}</Text>
              </View>
            </Pressable>
          ))}

          {/* Placeholder cards to fill space */}
          {[1, 2, 3].slice(todayEntries.length).map((i) => (
            <TouchableOpacity key={`placeholder-${i}`} style={styles.storyCardPlaceholder} onPress={handleLaunchCamera}>
               <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
               <View style={styles.placeholderBottom}>
                 <View style={styles.placeholderLineShort} />
                 <View style={styles.placeholderLineLong} />
               </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Writing Section */}
        <View style={styles.writingSection}>
          <View style={styles.writingHeader}>
            <Text style={styles.writingTitle}>Reflections</Text>
            <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
          </View>
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="How was your day? Write something..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={todayNote}
              onChangeText={setTodayNote}
              blurOnSubmit={false}
            />
          </View>
        </View>
      </ScrollView>

      {/* Focused Moment Modal */}
      <Modal
        visible={!!focusedMoment}
        transparent={true}
        animationType="none"
        onRequestClose={() => setFocusedMoment(null)}
      >
        <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill}>
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setFocusedMoment(null)}
          >
            <View style={styles.focusContainer}>
              {focusedMoment && (
                <>
                  <Animated.View style={{
                    flexDirection: 'row',
                    gap: 12,
                    marginBottom: 16,
                    transform: [{
                      translateY: popAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })
                    }],
                    opacity: popAnim
                  }}>
                    <Pressable 
                      style={[styles.actionButton, styles.deleteButton]} 
                      onPress={handleDeleteMoment}
                    >
                      <Ionicons name="trash" size={22} color="#FFF" />
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </Pressable>

                    <Pressable 
                      style={[styles.actionButton, styles.editButton]} 
                      onPress={handleEditMoment}
                    >
                      <Ionicons name="camera-reverse" size={22} color="#FFF" />
                      <Text style={styles.actionButtonText}>Retake</Text>
                    </Pressable>
                  </Animated.View>
                  
                  <Animated.View style={[
                    styles.focusedItem,
                    {
                      transform: [{
                        scale: popAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1]
                        })
                      }]
                    }
                  ]}>
                    <Image source={{ uri: focusedMoment.mediaUri }} style={styles.focusedImage} />
                    <View style={styles.focusedOverlay}>
                       <Text style={styles.focusedMomentText}>Selected Moment</Text>
                    </View>
                  </Animated.View>
                </>
              )}
            </View>
          </Pressable>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  greetingSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  streakWidget: {
    backgroundColor: colors.surface, 
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  streakLeft: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    minWidth: 80,
  },
  flameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCountText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  streakNumber: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  streakUnit: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  streakRight: {
    flex: 1,
    paddingLeft: 20,
  },
  streakTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 15,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeDayCircle: {
    backgroundColor: '#FFCC00', // Warm yellow fill for active days
    borderColor: '#FFCC00',
    borderRadius: 25, 
  },
  todayCircle: {
    backgroundColor: '#FFF', // Solid white background for today
    borderColor: '#FFCC00', // Yellow outline as requested
    borderWidth: 1.5,
    borderRadius: 16, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayDate: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  activeDateText: {
    color: '#1C1C1E', // Dark text on yellow background
  },
  futureDateText: {
    color: colors.textMuted,
  },
  todayDateText: {
    color: '#2C2C2A', // Dark text for today
  },
  dayName: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  dateSection: {
    paddingHorizontal: 20,
    marginTop: 35,
    marginBottom: 15,
  },
  dateText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  todayTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 6,
  },
  cardsScroll: {
    paddingLeft: 20,
  },
  addCard: {
    width: 140,
    height: 220,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cameraCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addCardText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  storyCard: {
    width: 140,
    height: 220,
    borderRadius: 24,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  storyCardPlaceholder: {
    width: 140,
    height: 220,
    borderRadius: 24,
    backgroundColor: '#E5E5EA',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  placeholderBottom: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
  },
  placeholderLineShort: {
    height: 8,
    width: '40%',
    backgroundColor: '#D1D1D6',
    borderRadius: 4,
    marginBottom: 6,
  },
  placeholderLineLong: {
    height: 8,
    width: '80%',
    backgroundColor: '#D1D1D6',
    borderRadius: 4,
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 15,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  storyBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFC00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  writingSection: {
    paddingHorizontal: 20,
    marginTop: 40,
  },
  writingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  writingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  textInputContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  textInput: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusContainer: {
    width: width - 48,
    alignItems: 'center',
  },
  focusedItem: {
    width: 200,
    height: 320,
    borderRadius: 32,
    backgroundColor: '#000',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  focusedImage: {
    width: '100%',
    height: '100%',
  },
  focusedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  focusedMomentText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  actionButton: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  editButton: {
    backgroundColor: colors.accent,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
});
