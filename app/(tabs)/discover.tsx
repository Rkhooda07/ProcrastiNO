import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, ScrollView, Dimensions } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../../constants/colors';
import { PODCASTS } from '../../constants/podcasts';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function DiscoverScreen() {
  const featuredPodcasts = PODCASTS.slice(0, 3);
  const remainingPodcasts = PODCASTS.slice(3);

  const openLink = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  const renderPodcastCard = (item: any, isHorizontal = false) => (
    <Pressable
      key={item.id}
      style={[styles.card, isHorizontal ? styles.horizontalCard : styles.verticalCard]}
      onPress={() => openLink(item.url)}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      <View style={styles.cardInfo}>
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.source}</Text>
          </View>
          <Text style={styles.duration}>{item.duration}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.tagsContainer}>
          {item.tags.map((tag: string) => (
            <Text key={tag} style={styles.tag}>#{tag}</Text>
          ))}
        </View>
      </View>
      <Pressable style={styles.bookmarkBtn}>
        <Ionicons name="bookmark-outline" size={20} color={colors.textSecondary} />
      </Pressable>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.horizontalScroll}
        >
          {featuredPodcasts.map(p => renderPodcastCard(p, true))}
        </ScrollView>
      </View>

      <View style={[styles.section, styles.verticalSection]}>
        <Text style={styles.sectionTitle}>More for You</Text>
        {remainingPodcasts.map(p => renderPodcastCard(p, false))}
      </View>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  horizontalScroll: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  horizontalCard: {
    width: width * 0.75,
    marginRight: 16,
  },
  verticalCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  thumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: colors.border,
  },
  cardInfo: {
    padding: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  duration: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: 13,
    color: colors.textSecondary,
    marginRight: 8,
  },
  bookmarkBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalSection: {
    paddingBottom: 20,
  }
});
