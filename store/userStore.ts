import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Fixed IDs for the 2 users (MUST be valid UUIDs for Supabase)
export const RAKSHIT_ID = '8b693895-7145-4202-8692-06992f7682f6';
export const SNEH_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

interface UserState {
  currentUserId: string | null;
  currentUserName: string | null;
  partnerId: string | null;
  partnerName: string | null;
  profilePics: Record<string, string>; // { [userId]: uri }
  hasChosenUser: boolean;
  _hasHydrated: boolean;
  setUser: (id: string) => Promise<void>;
  setProfilePic: (userId: string, uri: string) => void;
  fetchProfilePics: (userIds: string[]) => Promise<void>;
  uploadProfilePic: (userId: string, uri: string, mimeType?: string | null) => Promise<void>;
  subscribeToProfilePics: (userIds: string[]) => () => void;
  resetUser: () => void;
  setHasHydrated: (state: boolean) => void;
}

const PROFILE_PICTURE_BUCKET = 'profile-pictures';

function getImageExtension(mimeType?: string | null) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function mergeProfilePics(
  set: (partial: Partial<UserState> | ((state: UserState) => Partial<UserState>)) => void,
  rows: Array<{ user_id: string; image_url: string | null; updated_at?: string | null }>
) {
  set((state) => {
    const nextProfilePics = { ...state.profilePics };

    rows.forEach((row) => {
      if (row.user_id && row.image_url) {
        const separator = row.image_url.includes('?') ? '&' : '?';
        const cacheKey = row.updated_at ? `${separator}v=${encodeURIComponent(row.updated_at)}` : '';
        nextProfilePics[row.user_id] = `${row.image_url}${cacheKey}`;
      }
    });

    return { profilePics: nextProfilePics };
  });
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUserId: null,
      currentUserName: null,
      partnerId: null,
      partnerName: null,
      profilePics: {},
      hasChosenUser: false,
      _hasHydrated: false,
      setUser: async (id: string) => {
        const isRakshit = id === RAKSHIT_ID;
        const currentUserName = isRakshit ? 'Rakshit' : 'Sneh';
        const partnerId = isRakshit ? SNEH_ID : RAKSHIT_ID;
        const partnerName = isRakshit ? 'Sneh' : 'Rakshit';

        set({ 
          currentUserId: id, 
          currentUserName, 
          partnerId, 
          partnerName, 
          hasChosenUser: true 
        });

        // Seed stats in the background so profile selection feels instant.
        void Promise.all([
          supabase.from('user_stats').upsert({ user_id: id }, { onConflict: 'user_id' }),
          supabase.from('user_stats').upsert({ user_id: partnerId }, { onConflict: 'user_id' }),
        ]).catch((error) => {
          console.warn('Failed to seed user stats', error);
        });
      },
      setProfilePic: (userId, uri) => {
        set((state) => ({
          profilePics: { ...state.profilePics, [userId]: uri }
        }));
      },
      fetchProfilePics: async (userIds) => {
        if (userIds.length === 0) return;

        const { data, error } = await supabase
          .from('profile_pictures')
          .select('user_id, image_url, updated_at')
          .in('user_id', userIds);

        if (error) {
          console.warn('Failed to fetch profile pictures', error);
          return;
        }

        if (data) {
          mergeProfilePics(set, data);
        }
      },
      uploadProfilePic: async (userId, uri, mimeType) => {
        set((state) => ({
          profilePics: { ...state.profilePics, [userId]: uri },
        }));

        const response = await fetch(uri);
        const blob = await response.blob();
        const extension = getImageExtension(mimeType);
        const imagePath = `${userId}/avatar-${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(PROFILE_PICTURE_BUCKET)
          .upload(imagePath, blob, {
            contentType: mimeType || 'image/jpeg',
            cacheControl: '31536000',
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from(PROFILE_PICTURE_BUCKET)
          .getPublicUrl(imagePath);

        const updatedAt = new Date().toISOString();
        const imageUrl = publicUrlData.publicUrl;

        const { error: upsertError } = await supabase
          .from('profile_pictures')
          .upsert(
            {
              user_id: userId,
              image_path: imagePath,
              image_url: imageUrl,
              updated_at: updatedAt,
            },
            { onConflict: 'user_id' }
          );

        if (upsertError) {
          throw upsertError;
        }

        mergeProfilePics(set, [{ user_id: userId, image_url: imageUrl, updated_at: updatedAt }]);
      },
      subscribeToProfilePics: (userIds) => {
        const userIdSet = new Set(userIds);
        const channel = supabase
          .channel('profile-pictures-realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'profile_pictures' },
            (payload) => {
              const next = payload.new as { user_id?: string; image_url?: string | null; updated_at?: string | null };
              if (!next?.user_id || !userIdSet.has(next.user_id)) return;
              mergeProfilePics(set, [
                {
                  user_id: next.user_id,
                  image_url: next.image_url ?? null,
                  updated_at: next.updated_at ?? null,
                },
              ]);
            }
          )
          .subscribe();

        return () => {
          void supabase.removeChannel(channel);
        };
      },
      resetUser: () => {
        set({ 
          currentUserId: null, 
          currentUserName: null, 
          partnerId: null, 
          partnerName: null, 
          hasChosenUser: false 
        });
      },
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'user-storage-v2', // Changed from 'user-storage' to force a clean slate
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
