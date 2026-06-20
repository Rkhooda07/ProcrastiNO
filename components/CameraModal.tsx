import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string, type: 'image' | 'video') => void;
}

const { width, height } = Dimensions.get('window');

export default function CameraModal({ visible, onClose, onCapture }: CameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const isPressingRef = useRef(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [cameraReady, setCameraReady] = useState(false);

  const [mode, setMode] = useState<'picture' | 'video'>('picture');
  const recordingStartTimeRef = useRef<number>(0);

  const startVideoRecording = async () => {
    if (cameraRef.current && !isRecordingRef.current) {
      isRecordingRef.current = true;
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Animate progress bar over 30s
      ringProgress.value = withTiming(1, { duration: 30000 });

      // Track the actual start time of the recording
      recordingStartTimeRef.current = Date.now();

      try {
        const video = await cameraRef.current.recordAsync({
          maxDuration: 30,
          quality: '720p',
        } as any);
        if (video) {
          onCapture(video.uri, 'video');
          onClose();
        }
      } catch (error) {
        console.error('Recording failed:', error);
      } finally {
        isRecordingRef.current = false;
        setIsRecording(false);
        ringProgress.value = withTiming(0, { duration: 200 });
      }
    }
  };

  const prepareAndStartRecording = () => {
    isPressingRef.current = true;
    setMode('video');
    
    // We add a 350ms delay for camera reconfig from picture mode to video mode.
    setTimeout(() => {
      if (isPressingRef.current) {
        startVideoRecording();
      }
    }, 350);
  };

  const stopVideoRecording = async () => {
    isPressingRef.current = false;
    
    // If recording never started, reset mode
    if (!isRecordingRef.current) {
      setMode('picture');
      return;
    }
    const minDuration = 600; // ensure at least 0.6s of data
    const elapsed = Date.now() - recordingStartTimeRef.current;
    const delay = elapsed < minDuration ? minDuration - elapsed : 0;
    // wait the remaining time if needed
    await new Promise(resolve => setTimeout(resolve, delay));
    if (cameraRef.current && isRecordingRef.current) {
      try {
        await cameraRef.current.stopRecording();
      } catch (e) {
        console.error('Error stopping recording:', e);
      }
      isRecordingRef.current = false;
      setIsRecording(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMode('picture');
    }
  };
  
  const readyOpacity = useSharedValue(0);
  const innerScale = useSharedValue(1);
  const outerScale = useSharedValue(1);
  const ringProgress = useSharedValue(0);

  // Request permissions on mount to pre-warm the camera
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
    if (!micPermission?.granted) {
      requestMicPermission();
    }
  }, []);

  const onCameraReady = () => {
    setCameraReady(true);
    readyOpacity.value = withTiming(1, { duration: 300 });
  };

  const toggleFacing = () => {
    readyOpacity.value = 0;
    setCameraReady(false);
    setFacing(prev => (prev === 'back' ? 'front' : 'back'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const capturePhoto = async () => {
    if (cameraRef.current && !isRecordingRef.current) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        let photo;
        try {
          // Attempt optimized capture
          photo = (await cameraRef.current.takePictureAsync({
            quality: 0.5,
            skipProcessing: true,
          } as any)) as any;
        } catch (firstError) {
          console.warn("Optimized photo capture failed, falling back to standard capture:", firstError);
          // Fallback to standard capture
          photo = (await cameraRef.current.takePictureAsync()) as any;
        }
        
        if (photo) {
          onCapture(photo.uri, 'image');
          onClose();
        }
      } catch (e) {
        console.error('Failed to take picture:', e);
      }
    }
  };

// Old recording handlers removed – using new implementations defined earlier

  const hasPermissions = permission?.granted && micPermission?.granted;

  // Gestures
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .runOnJS(true)
    .onEnd(() => {
      toggleFacing();
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .runOnJS(true)
    .onEnd(() => {
      capturePhoto();
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onBegin(() => {
      'worklet';
      innerScale.value = withSpring(0.75, { damping: 15, stiffness: 400 });
      outerScale.value = withSpring(1.3, { damping: 15, stiffness: 400 });
    })
    .onStart(() => {
      'worklet';
      runOnJS(prepareAndStartRecording)();
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(stopVideoRecording)();
      innerScale.value = withSpring(1);
      outerScale.value = withSpring(1);
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  // Animated Styles
  const placeholderAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - readyOpacity.value,
  }));

  const innerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));

  const outerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerScale.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${ringProgress.value * 100}%`,
  }));

  return (
    <View 
      style={visible ? styles.containerVisible : styles.containerHidden} 
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        {hasPermissions ? (
          <GestureDetector gesture={doubleTapGesture}>
            <CameraView
              style={StyleSheet.absoluteFill}
              ref={cameraRef}
              facing={facing}
              mode={mode}
              onCameraReady={onCameraReady}
            />
          </GestureDetector>
        ) : (
          visible && (
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
          )
        )}

        {/* UI Overlay */}
        {visible && hasPermissions && (
          <View style={styles.overlay} pointerEvents="box-none">
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={32} color="white" />
            </TouchableOpacity>

            <View style={styles.controls} pointerEvents="box-none">
              <View style={styles.shutterContainer} pointerEvents="box-none">
                {/* Hint Text placed above shutter controls */}
                <Text style={styles.hintText}>
                  {isRecording ? 'Release to stop' : 'Tap for photo, Hold for video'}
                </Text>
                <View style={styles.shutterRow} pointerEvents="box-none">
                  {/* Shutter Button */}
                  <GestureDetector gesture={composedGesture}
                    >
                    <View style={styles.shutterTouchable} pointerEvents="box-none">
                      <Animated.View style={[styles.shutterOuter, outerAnimatedStyle]} />
                      <Animated.View style={[styles.shutterInner, innerAnimatedStyle, isRecording && styles.shutterInnerRecording]} />
                    </View>
                  </GestureDetector>

                  {/* Flip Button positioned next to shutter */}
                  <TouchableOpacity
                    style={[styles.bottomFlipButton, { opacity: isRecording ? 0 : 1, marginLeft: 8 }]}
                    onPress={toggleFacing}
                  >
                    <Ionicons name="camera-reverse-outline" size={28} color="white" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.hintText}>
                  {isRecording ? 'Release to stop' : 'Tap for photo, Hold for video'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Smooth Fade Transition Placeholder */}
        {hasPermissions && (
          <Animated.View
            style={[styles.placeholder, placeholderAnimatedStyle]}
            pointerEvents="none"
          />
        )}
      </GestureHandlerRootView>
    </View>
  );
}

const styles = StyleSheet.create({
  containerVisible: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'black',
    zIndex: 1000,
  },
  containerHidden: {
    position: 'absolute',
    width: width,
    height: height,
    opacity: 0,
    top: -height * 2,
    left: -width * 2,
    zIndex: -1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    padding: 20,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 4,
  },
  controls: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterContainer: {
    alignItems: 'center',
    gap: 12,
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 8,
  },
  shutterSpacer: {
    width: 50,
  },
  bottomFlipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterTouchable: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterOuter: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  shutterInnerRecording: {
    backgroundColor: '#FF3B30',
  },
  hintText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  text: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'black',
    zIndex: 5,
  },
});
