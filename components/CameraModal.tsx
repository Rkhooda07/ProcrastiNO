import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string, type: 'image' | 'video') => void;
}

export default function CameraModal({ visible, onClose, onCapture }: CameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Request both Camera and Microphone permissions
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.permissionContainer}>
          <Text style={styles.text}>We need camera and microphone access</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.text}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo) {
        onCapture(photo.uri, 'image');
        onClose();
      }
    }
  };

  const startRecording = async () => {
    if (cameraRef.current) {
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        const video = await cameraRef.current.recordAsync({ maxDuration: 10 });
        if (video) {
          onCapture(video.uri, 'video');
          onClose();
        }
      } catch (error) {
        console.error("Recording failed", error);
      } finally {
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing="back" mode="video" />
        
        {/* Absolute positioned UI Overlay */}
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.shutter, isRecording && styles.recording]}
              onPress={takePicture}
              onLongPress={startRecording}
              onPressOut={stopRecording}
              delayLongPress={300}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' },
  overlay: { ...StyleSheet.absoluteFillObject, padding: 20, justifyContent: 'space-between' },
  closeButton: { marginTop: 40, alignSelf: 'flex-start' },
  controls: { marginBottom: 40, alignItems: 'center' },
  shutter: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' },
  recording: { borderColor: '#FF3B30', backgroundColor: '#FF3B30' },
  text: { color: 'white', fontSize: 16, textAlign: 'center' },
  button: { marginTop: 20, padding: 10, backgroundColor: 'blue', borderRadius: 5 }
});
