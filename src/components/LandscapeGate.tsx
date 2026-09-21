import { useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ko } from '../i18n/ko';
import { palette } from '../theme/tokens';

interface LandscapeGateProps { children: ReactNode; blocked: boolean; onInactive(): void }

export function useWebPortraitGate(): boolean {
  const { width, height } = useWindowDimensions();
  return Platform.OS === 'web' && width > 0 && height > width;
}

export function LandscapeGate({ children, blocked, onInactive }: LandscapeGateProps): React.JSX.Element {
  const [orientationHint, setOrientationHint] = useState(false);

  useEffect(() => { if (blocked) onInactive(); }, [blocked, onInactive]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let mounted = true;
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
      .catch(() => { if (mounted) setOrientationHint(true); });
    return () => { mounted = false; };
  }, []);

  return (
    <View style={styles.fill}>
      <View testID="landscape-content" style={[styles.fill, blocked && styles.hidden]}
        pointerEvents={blocked ? 'none' : 'auto'}
        accessibilityElementsHidden={blocked} importantForAccessibility={blocked ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
      {orientationHint && <Text testID="orientation-hint" style={styles.hint}>{ko.orientationHint}</Text>}
      {blocked && (
        <View testID="landscape-gate" style={styles.gate} accessibilityViewIsModal>
          <Text style={styles.icon} accessibilityElementsHidden>↻</Text>
          <Text accessibilityRole="header" style={styles.title}>{ko.rotateTitle}</Text>
          <Text style={styles.description}>{ko.rotateDescription}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Keep the scene mounted, but remove hidden buttons from browser keyboard focus.
  hidden: { display: 'none' },
  gate: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, backgroundColor: palette.background,
    alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  icon: { fontSize: 60, color: palette.navy },
  title: { color: palette.ink, fontSize: 23, fontWeight: '800', textAlign: 'center' },
  description: { color: palette.ink, maxWidth: 340, fontSize: 16, lineHeight: 25, textAlign: 'center' },
  hint: { position: 'absolute', bottom: 8, alignSelf: 'center', maxWidth: '55%', zIndex: 40,
    color: palette.ink, backgroundColor: palette.background, fontSize: 12, padding: 6, textAlign: 'center' },
});
