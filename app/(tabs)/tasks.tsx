import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useUserStore } from '../../store/userStore';
import { useTaskStore } from '../../store/taskStore';
import { TaskItem } from '../../components/TaskItem';
import { colors } from '../../constants/colors';
import { DEFAULT_TASKS } from '../../constants/defaultTasks';
import { Pager } from '../../components/Pager';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function TasksScreen() {
  const { currentUserId, partnerId } = useUserStore();
  const { tasks, isLoading, fetchTasks, toggleTask, subscribeToTasks } = useTaskStore();
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
      fetchTasks(currentUserId!, partnerId);
    }
  }

  const myTasks = tasks.filter((t) => t.owner_id === currentUserId);
  const friendTasks = tasks.filter((t) => t.owner_id === partnerId);

  const renderTaskList = (data: any[], isOwner: boolean, title: string) => (
    <View style={styles.page}>
      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>{title}</Text>
        <Text style={styles.pageSubtitle}>
          {data.filter(t => t.is_done).length} of {data.length} completed
        </Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            isOwner={isOwner}
            onToggle={toggleTask}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No tasks for today yet.</Text>
          </View>
        }
      />
    </View>
  );

  if (isLoading && tasks.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        <View key="1">
          {renderTaskList(myTasks, true, "My Tasks")}
        </View>
        <View key="2">
          {renderTaskList(friendTasks, false, "Partner's Tasks")}
        </View>
      </Pager>
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
    marginVertical: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: 40,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
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
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
  },
});
