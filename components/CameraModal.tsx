import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text, Dimensions } from 'react-native';
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

  useEffect(() => {
    if (visible && (!permission || !permission.granted)) {
      requestPermission();
    }
  }, [visible, permission]);

  if (!permission) return <View />;

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
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
      setIsRecording(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {permission.granted ? (
          <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing="back" mode="video" />
        ) : (
          <View style={styles.permissionContainer}>
            <Text style={styles.text}>Camera and microphone access required</Text>
            <TouchableOpacity style={styles.button} onPress={requestPermission}>
              <Text style={styles.text}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* UI Overlay */}
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
  container: { flex: 1, backgroundColor: 'black' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, padding: 20, justifyContent: 'space-between' },
  closeButton: { marginTop: 40, alignSelf: 'flex-start' },
  controls: { marginBottom: 40, alignItems: 'center' },
  shutter: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)' },
  recording: { borderColor: '#FF3B30', backgroundColor: '#FF3B30' },
  text: { color: 'white', fontSize: 16, textAlign: 'center' },
  button: { marginTop: 20, padding: 10, backgroundColor: 'blue', borderRadius: 5 }
});
