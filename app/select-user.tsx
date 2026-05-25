import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore, RAKSHIT_ID, SNEH_ID } from '../store/userStore';
import { colors } from '../constants/colors';

export default function UserSelection() {
  const { setUser } = useUserStore();
  const router = useRouter();

  const handleSelect = (id: string) => {
    setUser(id);
    router.replace('/tasks');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Who's using ProcrastiNO?</Text>

        <View style={styles.profileContainer}>
          <Pressable 
            style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
            onPress={() => handleSelect(RAKSHIT_ID)}
          >
            <View style={[styles.avatarBox, { backgroundColor: '#A89AE6' }]}>
              <Text style={styles.avatarLetter}>R</Text>
            </View>
            <Text style={styles.name}>Rakshit</Text>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
            onPress={() => handleSelect(SNEH_ID)}
          >
            <View style={[styles.avatarBox, { backgroundColor: '#FFB7B2' }]}>
              <Text style={styles.avatarLetter}>S</Text>
            </View>
            <Text style={styles.name}>Sneh</Text>
          </Pressable>
        </View>

        <Pressable style={styles.manageBtn}>
          <Text style={styles.manageBtnText}>MANAGE PROFILES</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414', // Classic dark background for "Netflix" vibe
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 40,
  },
  profileContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 30,
  },
  profileCard: {
    alignItems: 'center',
    width: 120,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  avatarBox: {
    width: 100,
    height: 100,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLetter: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 16,
    color: '#808080',
    fontWeight: '400',
  },
  manageBtn: {
    marginTop: 80,
    borderWidth: 1,
    borderColor: '#808080',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  manageBtnText: {
    color: '#808080',
    fontSize: 14,
    letterSpacing: 2,
  },
});
