import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface UserState {
  session: Session | null;
  user: User | null;
  profilePics: Record<string, string>; // { [userId]: uri }
  _hasHydrated: boolean;
  setSession: (session: Session | null) => void;
  setProfilePic: (userId: string, uri: string) => void;
  fetchProfilePics: (userIds: string[]) => Promise<void>;
  uploadProfilePic: (userId: string, uri: string, mimeType?: string | null) => Promise<void>;
  subscribeToProfilePics: (userIds: string[]) => () => void;
  signOut: () => Promise<void>;
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
      session: null,
      user: null,
      profilePics: {},
      _hasHydrated: false,
      setSession: (session) => {
        set({ 
          session, 
          user: session?.user ?? null,
        });

        if (session?.user) {
          // Seed stats for the logged in user
          void (async () => {
            const { error } = await supabase
              .from('user_stats')
              .upsert({ user_id: session.user.id }, { onConflict: 'user_id' });

            if (error) {
              console.warn('Failed to seed user stats', error);
            }
          })();
        }
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
      signOut: async () => {
        await supabase.auth.signOut();
        set({ 
          session: null, 
          user: null,
        });
      },
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'user-storage-v3', // Incremented version
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
