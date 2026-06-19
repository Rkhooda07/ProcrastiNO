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
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useNavigation } from 'expo-router';
import { colors } from '../../constants/colors';
import { useJournalStore, JournalEntry } from '../../store/journalStore';
import { useUserStore } from '../../store/userStore';
import CameraModal from '../../components/CameraModal';

const { width, height } = Dimensions.get('window');

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function JournalScreen() {
  const { entries, addEntry, updateEntry, deleteEntry, streak, activeDates, markActive } = useJournalStore();
  const { currentUserName } = useUserStore();
  const [todayNote, setTodayNote] = useState('');
  const [greeting, setGreeting] = useState('GOOD MORNING');
  const [focusedMoment, setFocusedMoment] = useState<JournalEntry | null>(null);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    // Hide/show parent tab bar dynamically
    navigation.getParent()?.setOptions({
      tabBarStyle: isCameraVisible
        ? { display: 'none' }
        : {
            position: 'absolute',
            height: Platform.OS === 'ios' ? 104 : 84,
            paddingTop: 0,
            paddingBottom: 0,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
          },
    });
    // Hide/show header dynamically
    navigation.setOptions({
      headerShown: !isCameraVisible,
    });
  }, [isCameraVisible, navigation]);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const controlsTimerRef = useRef<any>(null);
  const popAnim = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(focusedMoment?.mediaType === 'video' ? (focusedMoment.mediaUri ?? '') : '', (player) => {
    player.loop = true;
    player.play();
  });
  
  useEffect(() => {
    if (focusedMoment) {
      Animated.spring(popAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }).start();
      
      if (focusedMoment.mediaType === 'video') {
        setIsPlaying(true);
        setIsMuted(false);
        setShowControls(false);
      }
    } else {
      popAnim.setValue(0);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    }
  }, [focusedMoment]);

  const togglePlayPause = () => {
    setIsPlaying(prev => {
      const next = !prev;
      if (next) {
        player.play();
      } else {
        player.pause();
      }
      return next;
    });
    
    // Reset timer when interacting with play/pause
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      player.muted = next;
      return next;
    });
    
    // Reset timer when interacting with mute
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handleVideoTap = () => {
    setShowControls(prev => {
      const nextState = !prev;
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      if (nextState) {
        controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
      }
      return nextState;
    });
  };

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

  const handleCameraCapture = (uri: string, type: 'image' | 'video') => {
    addEntry({ mediaUri: uri, mediaType: type, date: new Date().toISOString() });
  };

  const handleDeleteMoment = () => {
    if (!focusedMoment) return;
    const id = focusedMoment.id;
    setFocusedMoment(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    deleteEntry(id);
  };

  const handleSaveToGallery = async () => {
    if (!focusedMoment || !focusedMoment.mediaUri) return;
    try {
      const MediaLibrary = require('expo-media-library');
      if (!MediaLibrary || !MediaLibrary.saveToLibraryAsync) {
        throw new Error('MediaLibrary module not found');
      }
      
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(focusedMoment.mediaUri);
        Alert.alert('Success', 'Moment saved to gallery!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Permission Denied', 'Unable to save without gallery access.');
      }
    } catch (error) {
      console.error('Failed to save to gallery:', error);
      Alert.alert(
        'Action Required', 
        'This feature requires a new development build. Please run "npx expo run:android" or rebuild your app to enable saving to gallery.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Simplified Header/Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.pageTitle}>{currentUserName || 'User'}</Text>
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
          <TouchableOpacity style={styles.addCard} onPress={() => setIsCameraVisible(true)}>
            <View style={styles.cameraCircle}>
              <Ionicons name="camera" size={32} color={colors.textSecondary} />
            </View>
            <Text style={styles.addCardText}>Capture</Text>
          </TouchableOpacity>

          {todayEntries.map((entry, index) => (
            <Pressable 
              key={entry.id} 
              style={styles.storyCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFocusedMoment(entry);
              }}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setFocusedMoment(entry);
              }}
            >
              <Image source={{ uri: entry.mediaUri }} style={styles.storyImage} />
              <View style={styles.storyOverlay}>
                <View style={styles.storyHeader}>
                   {entry.mediaType === 'video' && (
                     <View style={[styles.storyBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                       <Ionicons name="play" size={12} color="#FFF" />
                     </View>
                   )}
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
            <TouchableOpacity key={`placeholder-${i}`} style={styles.storyCardPlaceholder} onPress={() => setIsCameraVisible(true)}>
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
    </SafeAreaView>

      <CameraModal 
        visible={isCameraVisible} 
        onClose={() => setIsCameraVisible(false)} 
        onCapture={handleCameraCapture}
      />

      {/* Focused Moment Modal */}
      <Modal
        visible={!!focusedMoment}
        transparent={true}
        animationType="none"
        onRequestClose={() => setFocusedMoment(null)}
      >
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setFocusedMoment(null)}
          >
            <View style={styles.focusContainer}>
              {focusedMoment && (
                <>
                  <View style={styles.modalHeader}>
                    <Pressable 
                      style={[styles.actionButton, styles.deleteButton]} 
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteMoment();
                      }}
                    >
                      <Ionicons name="trash" size={22} color="#FFF" />
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </Pressable>

                    <Pressable 
                      style={[styles.actionButton, styles.saveButton]} 
                      onPress={(e) => {
                        e.stopPropagation();
                        handleSaveToGallery();
                      }}
                    >
                      <Ionicons name="download-outline" size={22} color="#FFF" />
                      <Text style={styles.actionButtonText}>Save</Text>
                    </Pressable>

                    <Pressable 
                      style={[styles.actionButton, styles.closeButton]} 
                      onPress={(e) => {
                        e.stopPropagation();
                        setFocusedMoment(null);
                      }}
                    >
                      <Ionicons name="close" size={26} color="#FFF" />
                    </Pressable>
                  </View>
                  
                  <TouchableWithoutFeedback 
                    onPress={(e) => {
                      e.stopPropagation();
                      if (focusedMoment.mediaType === 'video') {
                        handleVideoTap();
                      }
                    }}
                  >
                    <View style={styles.focusedItem}>
                      {focusedMoment.mediaType === 'video' ? (
                        <View style={styles.focusedVideoContainer}>
                          <VideoView
                            player={player}
                            style={styles.focusedVideo}
                            contentFit="cover"
                            nativeControls={false}
                            allowsPictureInPicture={false}
                            pointerEvents="none"
                          />
                          
                          {/* Play/Pause button in center */}
                          {showControls && (
                            <View style={styles.playPauseOverlay} pointerEvents="box-none">
                              <TouchableOpacity 
                                activeOpacity={0.7}
                                style={styles.playPauseCircle} 
                                onPress={(e) => {
                                  e.stopPropagation();
                                  togglePlayPause();
                                }}
                              >
                                <Ionicons 
                                  name={isPlaying ? "pause" : "play"} 
                                  size={48} 
                                  color="#FFF" 
                                />
                              </TouchableOpacity>
                            </View>
                          )}
                          
                          {/* Mute button in bottom right */}
                          <TouchableOpacity 
                            activeOpacity={0.7}
                            style={styles.muteButton} 
                            onPress={(e) => {
                              e.stopPropagation();
                              toggleMute();
                            }}
                          >
                            <Ionicons 
                              name={isMuted ? "volume-mute" : "volume-high"} 
                              size={22} 
                              color="#FFF" 
                            />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Image source={{ uri: focusedMoment.mediaUri }} style={styles.focusedImage} />
                      )}
                    </View>
                  </TouchableWithoutFeedback>
                </>
              )}
            </View>
          </Pressable>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
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
    backgroundColor: 'transparent',
  },
  focusContainer: {
    width: width,
    height: height,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  focusedItem: {
    width: width * 0.85,
    height: height * 0.7,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  focusedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    resizeMode: 'cover',
  },
  focusedVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    overflow: 'hidden',
  },
  focusedVideoContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoPressArea: {
    flex: 1,
  },
  playPauseOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playPauseCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 54,
    paddingHorizontal: 0,
    justifyContent: 'center',
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
  saveButton: {
    backgroundColor: colors.accent,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
});
