import React, { useEffect, useState, useRef, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TextInput, Pressable, KeyboardAvoidingView, Platform, Modal, Animated } from 'react-native';
import { useUserStore } from '../../store/userStore';
import { useTaskStore, Task } from '../../store/taskStore';
import { TaskItem } from '../../components/TaskItem';
import { colors } from '../../constants/colors';
import { Pager } from '../../components/Pager';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

// Separate component for stability
const TaskList = memo(({ 
  data, 
  isOwner, 
  title, 
  ownerId, 
  onToggle, 
  onAdd,
  onLongPress
}: { 
  data: Task[], 
  isOwner: boolean, 
  title: string, 
  ownerId: string,
  onToggle: (id: string, done: boolean) => void,
  onAdd: (title: string, id: string) => void,
  onLongPress: (task: Task) => void
}) => {
  const [text, setText] = useState('');
  const completedCount = data.filter(t => t.is_done).length;
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAdd(text.trim(), ownerId);
    setText('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.headerSection}>
        <View style={styles.headerTop}>
          <Text style={[styles.pageTitle, { color: isOwner ? colors.accent : colors.accentMint }]}>
            {title}
          </Text>
          <Text style={styles.countBadge}>{data.length}</Text>
        </View>
        <View style={styles.headerSub}>
          <Text style={styles.completedText}>{completedCount} Completed</Text>
          <Text style={styles.dot}> • </Text>
          <Text style={styles.clearBtn}>Daily Tasks</Text>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }} 
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {data.map((item) => (
          <TaskItem
            key={item.id}
            task={item}
            isOwner={isOwner}
            onToggle={onToggle}
            onLongPress={onLongPress}
          />
        ))}

        <View style={styles.inlineInputContainer}>
          <View style={styles.circleIcon} />
          <TextInput
            style={styles.inlineInput}
            placeholder="New Task"
            placeholderTextColor="#AEAEB2"
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
            blurOnSubmit={false}
            onFocus={() => {
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
            }}
          />
          {text.length > 0 && (
            <Pressable onPress={handleSubmit} style={styles.addBtnSmall}>
              <Ionicons name="arrow-up-circle" size={32} color={colors.accent} />
            </Pressable>
          )}
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
});

export default function TasksScreen() {
  const { currentUserId, partnerId, partnerName } = useUserStore();
  const { tasks, isLoading, fetchTasks, toggleTask, addTask, deleteTask, makeRecurring, subscribeToTasks } = useTaskStore();
  const [currentPage, setCurrentPage] = useState(0);
  const [focusedTask, setFocusedTask] = useState<Task | null>(null);
  const pagerRef = useRef<any>(null);
  
  const popAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focusedTask) {
      Animated.spring(popAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 8
      }).start();
    } else {
      popAnim.setValue(0);
    }
  }, [focusedTask]);

  useEffect(() => {
    if (currentUserId) {
      fetchTasks(currentUserId, partnerId);
      const unsubscribe = subscribeToTasks(currentUserId, partnerId);
      return () => unsubscribe();
    }
  }, [currentUserId, partnerId]);

  const handleAddTask = async (title: string, ownerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addTask(title, ownerId);
  };

  const handleDeleteTask = async () => {
    if (!focusedTask) return;
    const id = focusedTask.id;
    setFocusedTask(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await deleteTask(id);
  };

  const handleToggleRecurring = async () => {
    if (!focusedTask) return;
    const id = focusedTask.id;
    const newState = !focusedTask.is_recurring;
    setFocusedTask(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await makeRecurring(id, newState);
  };

  const myTasks = tasks.filter((t) => t.owner_id === currentUserId);
  const friendTasks = tasks.filter((t) => t.owner_id === partnerId);

  if (isLoading && tasks.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <View style={styles.indicatorContainer}>
          <View style={[styles.indicator, currentPage === 0 && styles.indicatorActive]} />
          <View style={[styles.indicator, currentPage === 1 && styles.indicatorActive]} />
        </View>
        
        <Pager
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={0}
          onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
        >
          <View key="1" style={styles.page}>
            <TaskList 
              data={myTasks} 
              isOwner={true} 
              title="My Tasks" 
              ownerId={currentUserId!} 
              onToggle={toggleTask}
              onAdd={handleAddTask}
              onLongPress={setFocusedTask}
            />
          </View>
          <View key="2" style={styles.page}>
            <TaskList 
              data={friendTasks} 
              isOwner={false} 
              title={`${partnerName}'s Tasks`} 
              ownerId={partnerId!} 
              onToggle={toggleTask}
              onAdd={handleAddTask}
              onLongPress={setFocusedTask}
            />
          </View>
        </Pager>
      </KeyboardAvoidingView>

      {/* Delete Overlay with Real Glassmorphism Blur */}
      <Modal
        visible={!!focusedTask}
        transparent={true}
        animationType="none"
        onRequestClose={() => setFocusedTask(null)}
      >
        <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill}>
          <Pressable 
            style={styles.overlay} 
            onPress={() => setFocusedTask(null)}
          >
            <View style={styles.focusContainer}>
              {focusedTask && (
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
                      onPress={handleDeleteTask}
                    >
                      <Ionicons name="trash" size={22} color="#FFF" />
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </Pressable>

                    <Pressable 
                      style={[styles.actionButton, styles.recurringButton]} 
                      onPress={handleToggleRecurring}
                    >
                      <Ionicons 
                        name={focusedTask.is_recurring ? "calendar" : "calendar-outline"} 
                        size={22} 
                        color="#FFF" 
                      />
                      <Text style={styles.actionButtonText}>
                        {focusedTask.is_recurring ? "Remove Daily" : "Show Everyday"}
                      </Text>
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
                    <View style={[styles.circleIconMock, focusedTask.is_done && { backgroundColor: colors.accentMint, borderColor: colors.accentMint }]} />
                    <Text style={[styles.focusedText, focusedTask.is_done && { textDecorationLine: 'line-through', color: '#AEAEB2' }]}>
                      {focusedTask.title}
                    </Text>
                    {focusedTask.is_recurring && (
                       <Ionicons name="repeat" size={16} color={colors.accent} style={{ marginLeft: 8 }} />
                    )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  countBadge: {
    fontSize: 34,
    fontWeight: '300',
    color: '#AEAEB2',
  },
  headerSub: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  dot: {
    color: '#C7C7CC',
    marginHorizontal: 4,
  },
  clearBtn: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 40,
    paddingHorizontal: 4,
  },
  inlineInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14, // Matched with TaskItem
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  circleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    marginRight: 12,
  },
  inlineInput: {
    flex: 1,
    fontSize: 18,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  addBtnSmall: {
    marginLeft: 8,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  indicator: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: colors.accent,
    width: 32,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusContainer: {
    width: width - 48,
    alignItems: 'center',
  },
  focusedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  circleIconMock: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    marginRight: 12,
  },
  focusedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  recurringButton: {
    backgroundColor: colors.accent,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
});
