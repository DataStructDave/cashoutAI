import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
  Modal,
  Alert,
  Dimensions,
  Animated,
} from "react-native";
import {
  PinchGestureHandler,
  State,
  type PinchGestureHandlerEventPayload,
} from "react-native-gesture-handler";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, fontSizes, radii, spacing } from "../../theme";
import { api, type Entry } from "../../api";
import { trackEvent } from "../../utils/analytics";

const KEY_CAMERA_ALERT_SEEN = "@cashoutai/camera_right_side_up_alert_seen";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ScanEntryProps = {
  selectedImages: string[];
  onImageAdded: (uri: string) => void;
  onImageRemoved: (index: number) => void;
  extracting?: boolean;
  onExtractingChange?: (value: boolean) => void;
  onExtractedEntries?: (entries: Entry[]) => void;
};

export default function ScanEntry({
  selectedImages,
  onImageAdded,
  onImageRemoved,
  extracting = false,
  onExtractingChange,
  onExtractedEntries,
}: ScanEntryProps) {
  const insets = useSafeAreaInsets();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Camera controls (reset when opening camera)
  const [flashMode, setFlashMode] = useState<"off" | "on" | "auto">("off");
  const [zoom, setZoom] = useState(0);
  const ZOOM_MAX = 1;
  const ZOOM_MIN = 0;
  const PINCH_SENSITIVITY = 0.5;
  const pinchStartZoom = useRef(0);

  // Tap-to-focus: expo-camera has no focus-at-point API; we show a focus indicator and keep autofocus on
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const focusAnim = useRef(new Animated.Value(0)).current;

  const onPinchStateChange = (evt: {
    nativeEvent: { state: number; scale: number };
  }) => {
    if (evt.nativeEvent.state === State.BEGAN) {
      pinchStartZoom.current = zoom;
    }
  };

  const onPinchGesture = (evt: {
    nativeEvent: PinchGestureHandlerEventPayload;
  }) => {
    const { scale } = evt.nativeEvent;
    const newZoom = Math.max(
      ZOOM_MIN,
      Math.min(
        ZOOM_MAX,
        pinchStartZoom.current + (scale - 1) * PINCH_SENSITIVITY
      )
    );
    setZoom(newZoom);
  };

  useEffect(() => {
    if (!extracting) {
      pulseAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [extracting, pulseAnim]);

  const handleExtractPress = async () => {
    if (selectedImages.length === 0) {
      Alert.alert("No images", "Add at least one photo to extract.");
      return;
    }
    onExtractingChange?.(true);
    try {
      const result = await api.extractReceipts(selectedImages);
      const rawEntries = result?.entries ?? [];
      const entries = rawEntries.filter(
        (e): e is Entry => e != null && typeof e.total === "string"
      );
      if (entries.length > 0) {
        trackEvent("slip_scan_completed", { entry_count: entries.length });
        onExtractedEntries?.(entries);
        Alert.alert(
          "Extracted",
          `Added ${entries.length} receipt(s) from the photos.`
        );
      } else if (rawEntries.length > 0) {
        Alert.alert(
          "Extract",
          "Receipt data was received but entries were invalid. Try again."
        );
      } else {
        Alert.alert(
          "Extract",
          "No receipt data could be read from the images."
        );
      }
    } catch (err) {
      Alert.alert("Extract failed", (err as Error).message || "Request failed");
    } finally {
      onExtractingChange?.(false);
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Camera Permission",
          "Camera access is required to take photos."
        );
        return;
      }
    }
    const alertSeen = await AsyncStorage.getItem(KEY_CAMERA_ALERT_SEEN);
    if (alertSeen !== "true") {
      Alert.alert(
        "Tip",
        "Make sure your receipts are:\n\n• Right side up\n• Well-lit\n• Clear and in focus\n\nThis helps extract totals and payment info accurately.",
        [
          {
            text: "Got it",
            onPress: async () => {
              await AsyncStorage.setItem(KEY_CAMERA_ALERT_SEEN, "true");
              setCameraOpen(true);
              setFlashMode("off");
              setZoom(0);
            },
          },
        ]
      );

      return;
    }
    setCameraOpen(true);
    setFlashMode("off");
    setZoom(0);
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo?.uri) {
        onImageAdded(photo.uri);
        setCameraOpen(false);
      }
    }
  };

  const pickFromGallery = async () => {
    setGalleryPickerOpen(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 30,
      });

      if (!result.canceled && result.assets.length > 0) {
        result.assets.forEach((asset) => onImageAdded(asset.uri));
        setCameraOpen(false);
      }
    } finally {
      setGalleryPickerOpen(false);
    }
  };

  return (
    <>
      <View style={styles.imagesBox}>
        {selectedImages.length === 0 ? (
          <Text style={styles.imagesPlaceholder}>No images selected</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagesScrollContent}
          >
            {selectedImages.map((uri, index) => (
              <TouchableOpacity
                key={`${uri}-${index}`}
                style={styles.imageThumbWrapper}
                onPress={() => setPreviewImage(uri)}
                activeOpacity={0.9}
              >
                <Image source={{ uri }} style={styles.imageThumb} />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => onImageRemoved(index)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={colors.white}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
      <View style={styles.scanButtonsRow}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={openCamera}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={28} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scanButton, styles.scanButtonPrimary]}
          onPress={handleExtractPress}
          disabled={extracting}
          activeOpacity={0.8}
        >
          {extracting ? (
            <Animated.View
              style={[
                styles.extractIconWrap,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Ionicons name="sparkles" size={24} color={colors.onPrimary} />
            </Animated.View>
          ) : (
            <>
              <Ionicons
                name="sparkles"
                size={20}
                color={colors.onPrimary}
                style={styles.extractIcon}
              />
              <Text style={styles.scanButtonPrimaryText}>Scan</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Camera Modal - PinchGestureHandler for zoom; tap on preview for focus indicator (expo-camera has no focus-at-point API) */}
      <Modal visible={cameraOpen} animationType="slide">
        <View style={styles.cameraContainer}>
          {/* Full-screen overlay so camera doesn't peek at top when system gallery is open */}
          {galleryPickerOpen && (
            <View style={styles.galleryOverlay} pointerEvents="none" />
          )}
          <PinchGestureHandler
            onHandlerStateChange={onPinchStateChange}
            onGestureEvent={onPinchGesture}
          >
            <View
              style={styles.camera}
              onTouchEnd={(e) => {
                if (e.nativeEvent.changedTouches?.length === 1) {
                  const t = e.nativeEvent.changedTouches[0];
                  setFocusPoint({ x: t.pageX, y: t.pageY });
                  focusAnim.setValue(0);
                  Animated.sequence([
                    Animated.timing(focusAnim, {
                      toValue: 1,
                      duration: 200,
                      useNativeDriver: true,
                    }),
                    Animated.delay(600),
                    Animated.timing(focusAnim, {
                      toValue: 0,
                      duration: 200,
                      useNativeDriver: true,
                    }),
                  ]).start(() => setFocusPoint(null));
                }
              }}
            >
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  flash={flashMode}
                  zoom={zoom}
                  autofocus="on"
                />
              </View>
              {focusPoint && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.focusIndicator,
                    {
                      left: focusPoint.x - 40,
                      top: focusPoint.y - 40,
                      opacity: focusAnim,
                      transform: [
                        {
                          scale: focusAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              )}
            </View>
          </PinchGestureHandler>
          <TouchableOpacity
            style={[styles.closeButton, { top: insets.top + 16 }]}
            onPress={() => setCameraOpen(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={32} color={colors.white} />
          </TouchableOpacity>
          <View style={[styles.cameraTopControls, { top: insets.top + 16 }]}>
            <TouchableOpacity
              style={styles.cameraControlButton}
              onPress={() =>
                setFlashMode((m) =>
                  m === "off" ? "on" : m === "on" ? "auto" : "off"
                )
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  flashMode === "on"
                    ? "flash"
                    : flashMode === "auto"
                    ? "flash-outline"
                    : "flash-off"
                }
                size={26}
                color={colors.white}
              />
              <Text style={styles.cameraControlLabel}>
                {flashMode === "on"
                  ? "On"
                  : flashMode === "auto"
                  ? "Auto"
                  : "Off"}
              </Text>
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.cameraControls,
              { paddingBottom: insets.bottom + 20 },
            ]}
          >
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={pickFromGallery}
              activeOpacity={0.7}
            >
              <Ionicons name="images" size={28} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
              activeOpacity={0.8}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <View style={styles.controlSpacer} />
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={previewImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.previewContainer}>
          <TouchableOpacity
            style={styles.previewBackdrop}
            activeOpacity={1}
            onPress={() => setPreviewImage(null)}
          >
            <TouchableOpacity
              style={styles.previewCloseButton}
              onPress={() => setPreviewImage(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={32} color={colors.white} />
            </TouchableOpacity>
            {previewImage && (
              <Image
                source={{ uri: previewImage }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  imagesBox: {
    width: "100%",
    minHeight: 280,
    marginTop: spacing["2xl"],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imagesScrollContent: {
    padding: spacing.base,
    gap: spacing.base,
    flexDirection: "row",
  },
  imageThumbWrapper: {
    position: "relative",
  },
  imageThumb: {
    width: SCREEN_WIDTH * 0.5,
    height: 240,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
  },
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  imagesPlaceholder: {
    fontSize: fontSizes.sm,
    color: colors.primary,
  },
  scanButtonsRow: {
    flexDirection: "row",
    width: "100%",
    gap: spacing.base,
    marginTop: spacing.xl,
  },
  scanButton: {
    flex: 1,
    paddingVertical: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  extractIcon: {
    marginRight: 6,
  },
  extractIconWrap: {},
  scanButtonPrimaryText: {
    fontSize: fontSizes.md,
    fontWeight: "600",
    color: colors.onPrimary,
  },

  /* Camera Modal */
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  galleryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 100,
  },
  camera: {
    flex: 1,
  },
  focusIndicator: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "transparent",
  },
  closeButton: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraTopControls: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    alignItems: "flex-end",
    gap: 12,
  },
  cameraControlButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraControlLabel: {
    fontSize: 9,
    color: colors.white,
    marginTop: 2,
  },
  cameraControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 30,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
  },
  controlSpacer: {
    width: 50,
  },

  /* Image Preview Modal */
  previewContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  previewBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
