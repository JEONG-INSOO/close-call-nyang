import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

let lastWobble = -Infinity;
export async function playHaptic(cue: 'wobble' | 'fall' | 'coffee', enabled: boolean): Promise<void> {
  if (!enabled || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
  if (cue === 'wobble') {
    const now = Date.now();
    if (now >= lastWobble && now - lastWobble < 1500) return;
    lastWobble = now;
  }
  try {
    if (cue === 'fall') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch { /* Devices may not support feedback or may suppress it in low power mode. */ }
}
