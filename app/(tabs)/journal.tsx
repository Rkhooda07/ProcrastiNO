import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../constants/colors';
import { useJournalStore } from '../../store/journalStore';

const { width } = Dimensions.get('window');

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function JournalScreen() {
  const { entries, addEntry, streak } = useJournalStore();
  const [todayNote, setTodayNote] = useState('');
  const [greeting, setGreeting] = useState('GOOD MORNING');
  
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('GOOD MORNING');
    else if (hour < 17) setGreeting('GOOD AFTERNOON');
    else setGreeting('GOOD EVENING');
  }, []);

  // Get today's images from the store
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todayImages = entries
    .filter(e => new Date(e.date) >= todayStart)
    .map(e => e.mediaUri)
    .filter((uri): uri is string => !!uri);

  // Calculate current week dates
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sunday
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(today.getFullYear(), today.getMonth(), diff);
  
  const weekDates = DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.getDate();
  });

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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Simplified Header/Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.pageTitle}>Journal</Text>
        </View>

        {/* Streak Widget (Strava Style) */}
        <View style={styles.streakWidget}>
          <View style={styles.streakLeft}>
            <View style={styles.flameContainer}>
              <Ionicons name="flame" size={40} color={streak > 0 ? colors.streakOrange : "#8E8E93"} />
              <Text style={styles.streakNumber}>{streak}</Text>
            </View>
            <Text style={styles.streakUnit}>Days</Text>
          </View>
          <View style={styles.streakRight}>
            <Text style={styles.streakTitle}>Your streak</Text>
            <View style={styles.daysRow}>
              {DAYS.map((day, i) => {
                const dateVal = weekDates[i];
                const isToday = dateVal === new Date().getDate();
                const isFuture = dateVal > new Date().getDate();
                
                return (
                  <View key={i} style={styles.dayColumn}>
                    <View style={[
                      styles.dayCircle, 
                      isToday && styles.todayCircle,
                      !isToday && !isFuture && styles.pastDayCircle
                    ]}>
                      <Text style={[
                        styles.dayDate, 
                        isToday && styles.todayDateText,
                        !isToday && !isFuture && styles.pastDateText
                      ]}>{dateVal}</Text>
                      {isToday && (
                         <View style={styles.stravaIconContainer}>
                           <MaterialCommunityIcons name="triangle" size={12} color={colors.streakOrange} />
                         </View>
                      )}
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

          {todayImages.map((uri, index) => (
            <View key={index} style={styles.storyCard}>
              <Image source={{ uri }} style={styles.storyImage} />
              <View style={styles.storyOverlay}>
                <View style={styles.storyHeader}>
                   <View style={styles.storyBadge}>
                     <Ionicons name="star" size={10} color="#000" />
                   </View>
                </View>
                <Text style={styles.storyText}>Moment {index + 1}</Text>
              </View>
            </View>
          ))}

          {/* Placeholder cards to fill space */}
          {[1, 2, 3].slice(todayImages.length).map((i) => (
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
    backgroundColor: '#1C1C1E', 
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  streakLeft: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#3A3A3C',
  },
  flameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNumber: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    position: 'absolute',
    top: 10,
  },
  streakUnit: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  streakRight: {
    flex: 1,
    paddingLeft: 20,
  },
  streakTitle: {
    color: '#FFF',
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
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  pastDayCircle: {
    backgroundColor: '#3A3A3C',
  },
  todayCircle: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  dayDate: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
  },
  pastDateText: {
    color: '#FFF',
  },
  todayDateText: {
    color: '#FFF',
  },
  dayName: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
  },
  stravaIconContainer: {
    position: 'absolute',
    top: -12,
    right: -8,
    transform: [{ rotate: '180deg' }],
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
});
