import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ko } from '../i18n/ko';
import { palette, ui } from '../theme/tokens';

export interface ResultScreenProps {
  score: number; bestScore: number; canRevive: boolean;
  onRetry(): void; onHome(): void; onShare(): void; onRevive(): void;
}

export function ResultScreen({ score, bestScore, canRevive, onRetry, onHome, onRevive }: ResultScreenProps) {
  const result = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  const best = Math.max(result, Number.isFinite(bestScore) ? Math.max(0, Math.floor(bestScore)) : 0);
  return (
    <View testID="result-screen" style={styles.root} accessibilityViewIsModal>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>{ko.resultTitle}</Text>
        <View style={styles.scoreBlock} accessible accessibilityLabel={`${ko.scoreLabel} ${result}%`}>
          <Text style={styles.label}>{ko.scoreLabel}</Text>
          <Text testID="result-score" style={[styles.score, result >= 100 && styles.success]}>{result}%</Text>
        </View>
        <View style={styles.record} accessible accessibilityLabel={`${ko.bestLabel} ${best}%`}>
          <Text style={styles.label}>{ko.bestLabel}</Text><Text testID="result-best" style={styles.best}>{best}%</Text>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={ko.home} onPress={onHome}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>{ko.home}</Text>
          </Pressable>
          <Pressable testID="retry-button" accessibilityRole="button" accessibilityLabel={ko.retry} onPress={onRetry}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>{ko.retry}</Text>
          </Pressable>
        </View>
        {canRevive && <Pressable testID="revive-button" accessibilityRole="button" accessibilityLabel={ko.revive} onPress={onRevive}
          style={({ pressed }) => [styles.revive, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>{ko.revive}</Text>
        </Pressable>}
        {/* Share stays hidden until the T05 sharing service exists. */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: ui.gutter, backgroundColor: palette.overlay, zIndex: 4 },
  card: { width: '100%', maxWidth: 350, padding: 22, borderRadius: 26, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.border },
  title: { color: palette.ink, fontSize: 21, lineHeight: 29, fontWeight: '800', textAlign: 'center' },
  scoreBlock: { alignItems: 'center', marginTop: 15 },
  label: { color: palette.muted, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  score: { color: palette.ink, fontSize: 47, lineHeight: 57, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  success: { color: palette.scoreSuccess },
  record: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 13, backgroundColor: palette.background, marginTop: 10, marginBottom: 18 },
  best: { color: palette.ink, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 10 },
  primary: { flex: 1.35, minHeight: 50, paddingHorizontal: 10, borderRadius: 16, backgroundColor: palette.mint, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: palette.ink, fontSize: 16, fontWeight: '800' },
  secondary: { flex: 1, minHeight: 50, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: palette.ink, fontSize: 14, fontWeight: '600' },
  revive: { minHeight: ui.minTapSize, alignItems: 'center', justifyContent: 'center', marginTop: 9, borderRadius: 14, backgroundColor: palette.lavender },
  pressed: { opacity: 0.7 },
});
