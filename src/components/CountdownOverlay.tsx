import { StyleSheet, Text, View } from 'react-native';
import { ko } from '../i18n/ko';
import { palette } from '../theme/tokens';

export interface CountdownOverlayProps { seconds: number }

/** Engine time is the only clock: there is deliberately no local timer. */
export function CountdownOverlay({ seconds }: CountdownOverlayProps) {
  const count = Number.isFinite(seconds) ? Math.max(1, Math.min(3, Math.ceil(seconds))) : 3;
  return (
    <View testID="countdown-overlay" pointerEvents="none" style={styles.root}>
      <View style={styles.badge} accessible accessibilityRole="text" accessibilityLiveRegion="polite" accessibilityLabel={`${ko.countdownReady} ${count}`}>
        <Text style={styles.label}>{ko.countdownReady}</Text>
        <Text testID="countdown-number" style={styles.number}>{count}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  badge: { width: 136, height: 136, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.paper, borderRadius: 48, borderWidth: 2, borderColor: palette.lavender },
  label: { fontSize: 13, lineHeight: 20, fontWeight: '600', color: palette.muted },
  number: { fontSize: 67, lineHeight: 77, fontWeight: '800', color: palette.ink, fontVariant: ['tabular-nums'] },
});
