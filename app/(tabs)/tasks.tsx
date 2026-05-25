import React, { useEffect, useState, useRef, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useUserStore } from '../../store/userStore';
import { useTaskStore, Task } from '../../store/taskStore';
import { TaskItem } from '../../components/TaskItem';
import { colors } from '../../constants/colors';
import { DEFAULT_TASKS } from '../../constants/defaultTasks';
import { Pager } from '../../components/Pager';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Separate component for stability - No FlatList here to prevent nesting crashes
const TaskList = memo(({ 
  data, 
  isOwner, 
  title, 
  ownerId, 
  onToggle, 
  onAdd 
}: { 
  data: Task[], 
  isOwner: boolean, 
  title: string, 
  ownerId: string,
  onToggle: (id: string, done: boolean) => void,
  onAdd: (title: string, id: string) => void
}) => {
  const [text, setText] = useState('');
  const completedCount = data.filter(t => t.is_done).length;

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAdd(text.trim(), ownerId);
    setText('');
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
          />
          {text.length > 0 && (
            <Pressable onPress={handleSubmit} style={styles.addBtnSmall}>
              <Ionicons name="arrow-up-circle" size={32} color={colors.accent} />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
});

export default function TasksScreen() {
  const { currentUserId, partnerId, partnerName } = useUserStore();
  const { tasks, isLoading, fetchTasks, toggleTask, addTask, subscribeToTasks } = useTaskStore();
  const [currentPage, setCurrentPage] = useState(0);
  const pagerRef = useRef<any>(null);

  useEffect(() => {
    if (currentUserId) {
      fetchTasks(currentUserId, partnerId);
      seedTasksIfNeeded(currentUserId);
      const unsubscribe = subscribeToTasks(currentUserId, partnerId);
      return () => unsubscribe();
    }
  }, [currentUserId, partnerId]);

  async function seedTasksIfNeeded(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('tasks')
      .select('id')
      .eq('owner_id', userId)
      .eq('date', today);

    if (data && data.length === 0) {
      const tasksToInsert = DEFAULT_TASKS.map((title) => ({
        owner_id: userId,
        title,
        date: today,
        is_done: false,
      }));
      await supabase.from('tasks').insert(tasksToInsert);
      if (currentUserId) fetchTasks(currentUserId, partnerId);
    }
  }

  const handleAddTask = async (title: string, ownerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addTask(title, ownerId);
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
            />
          </View>
        </Pager>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
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
    paddingBottom: 60,
  },
  inlineInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
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
});
