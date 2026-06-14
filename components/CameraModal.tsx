import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string, type: 'image' | 'video') => void;
}

export default function CameraModal({ visible, onClose, onCapture }: CameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [mode, setMode] = useState<'picture' | 'video'>('picture');

  useEffect(() => {
    if (visible) {
      if (!permission?.granted) requestPermission();
      if (!micPermission?.granted) requestMicPermission();
      // Reset to picture mode when opening
      setMode('picture');
    }
  }, [visible, permission, micPermission]);

  if (!permission || !micPermission) return <View />;

  const takePicture = async () => {
    // Prevent taking picture while preparing for video or recording
    if (cameraRef.current && !isRecording && !isPreparing) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ 
          quality: 0.8,
          skipProcessing: false // Set to false to ensure a valid image is produced
        });
        if (photo) {
          onCapture(photo.uri, 'image');
          onClose();
        }
      } catch (e) {
        console.error('Failed to take picture:', e);
      }
    }
  };

  const startRecording = async () => {
    if (cameraRef.current && !isRecording) {
      setIsPreparing(true);
      // Switch to video mode first
      setMode('video');
      
      // Give Android a moment to switch hardware modes
      setTimeout(async () => {
        try {
          setIsRecording(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const video = await cameraRef.current!.recordAsync({ 
            maxDuration: 15,
          });
          if (video) {
            onCapture(video.uri, 'video');
            onClose();
          }
        } catch (error) {
          console.error("Recording failed", error);
        } finally {
          setIsRecording(false);
          setIsPreparing(false);
        }
      }, 300); // 300ms buffer for mode switch
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && (isRecording || isPreparing)) {
      // If we released too early (during preparation), just reset
      if (isPreparing && !isRecording) {
        setIsPreparing(false);
        setMode('picture');
        return;
      }

      // Safety delay to ensure data production
      setTimeout(() => {
        if (cameraRef.current && isRecording) {
          cameraRef.current.stopRecording();
          setIsRecording(false);
          setMode('picture');
        }
      }, 800);
    }
  };

  const hasPermissions = permission.granted && micPermission.granted;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {hasPermissions ? (
          <CameraView 
            style={StyleSheet.absoluteFill} 
            ref={cameraRef} 
            facing="back" 
            mode={mode}
          />
        ) : (
          <View style={styles.permissionContainer}>
            <Text style={styles.text}>Camera and microphone access required</Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => {
                requestPermission();
                requestMicPermission();
              }}
            >
              <Text style={styles.text}>Grant Permissions</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* UI Overlay */}
        <View style={styles.overlay} pointerEvents="box-none">
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>
          
          <View style={styles.controls} pointerEvents="box-none">
            <View style={styles.shutterContainer}>
              <TouchableOpacity
                style={[styles.shutter, (isRecording || isPreparing) && styles.recording]}
                onPress={takePicture}
                onLongPress={startRecording}
                onPressOut={stopRecording}
                delayLongPress={300}
                activeOpacity={0.7}
              />
              <Text style={styles.hintText}>
                {isRecording || isPreparing ? 'Release to stop' : 'Tap for photo, Hold for video'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { 
    ...StyleSheet.absoluteFill, 
    padding: 20, 
    justifyContent: 'space-between',
    zIndex: 10
  },
  closeButton: { 
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 4
  },
  controls: { 
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterContainer: {
    alignItems: 'center',
    gap: 12
  },
  shutter: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: 'white', 
    borderWidth: 6, 
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10
  },
  recording: { 
    borderColor: 'rgba(255, 59, 48, 0.4)', 
    backgroundColor: '#FF3B30',
    transform: [{ scale: 1.2 }]
  },
  hintText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  text: { color: 'white', fontSize: 16, textAlign: 'center' },
  button: { marginTop: 20, padding: 12, backgroundColor: '#007AFF', borderRadius: 12 }
});
