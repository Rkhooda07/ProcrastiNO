import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../constants/colors';
import { Task } from '../store/taskStore';

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string, isDone: boolean) => void;
  onLongPress?: (task: Task) => void;
  isOwner: boolean;
}

export const TaskItem = ({ task, onToggle, onLongPress, isOwner }: TaskItemProps) => {
  const handlePress = () => {
    if (!isOwner) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onToggle(task.id, !task.is_done);
  };

  const handleLongPress = () => {
    if (!isOwner) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onLongPress?.(task);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && isOwner && styles.pressed,
        !isOwner && styles.disabled,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={!isOwner}
      delayLongPress={400}
    >
      <View style={[
        styles.checkbox,
        task.is_done && styles.checkboxChecked,
        !isOwner && task.is_done && styles.checkboxCheckedDisabled
      ]}>
        {task.is_done && (
          <Ionicons name="checkmark" size={16} color="#FFF" />
        )}
      </View>
      <Text style={[
        styles.title,
        task.is_done && styles.titleDone,
        !isOwner && styles.textDisabled
      ]}>
        {task.title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: colors.accentMint,
    borderColor: colors.accentMint,
  },
  checkboxCheckedDisabled: {
    opacity: 0.5,
  },
  title: {
    fontSize: 17,
    color: '#1C1C1E',
    fontWeight: '600',
    flex: 1,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: '#AEAEB2',
  },
  textDisabled: {
    color: colors.textMuted,
  },
});
