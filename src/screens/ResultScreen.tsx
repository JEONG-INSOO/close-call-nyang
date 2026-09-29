import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHARACTERS, type CharacterId } from '../characters/catalog';
import { ko } from '../i18n/ko';
import { palette, ui } from '../theme/tokens';

export interface ResultScreenProps {
  score: number; bestScore: number; canRevive: boolean;
  onRetry(): void; onHome(): void; onRevive(): void;
  newlyUnlocked?: readonly CharacterId[]; startBusy?: boolean;
}

export function ResultScreen({ score, bestScore, canRevive, onRetry, onHome, onRevive,
  newlyUnlocked = [], startBusy = false }: ResultScreenProps) {
  const result = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  const best = Math.max(result, Number.isFinite(bestScore) ? Math.max(0, Math.floor(bestScore)) : 0);
  const awardedNames = CHARACTERS.filter(character => newlyUnlocked.includes(character.id)).map(character => ko[character.nameKey]);
  return (
    <View testID="result-screen" style={styles.root}>
      <View style={styles.card}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>{ko.resultTitle}</Text>
        <View style={styles.scoreBlock} accessible accessibilityLabel={`${ko.scoreLabel} ${result}%`}>
          <Text style={styles.label}>{ko.scoreLabel}</Text>
          <Text testID="result-score" style={[styles.score, result >= 100 && styles.success]}>{result}%</Text>
        </View>
        <View style={styles.record} accessible accessibilityLabel={`${ko.bestLabel} ${best}%`}>
          <Text style={styles.label}>{ko.bestLabel}</Text><Text testID="result-best" style={styles.best}>{best}%</Text>
        </View>
        <View style={styles.actions}>
          <Pressable testID="retry-button" accessibilityRole="button" accessibilityLabel={ko.retry} onPress={onRetry}
            disabled={startBusy} accessibilityState={{ disabled: startBusy, busy: startBusy }}
            style={({ pressed }) => [styles.button, styles.retry, startBusy && styles.pressed, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>{startBusy ? ko.starting : ko.retry}</Text>
          </Pressable>
          <Pressable testID="result-home" accessibilityRole="button" accessibilityLabel={ko.home} onPress={onHome}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>{ko.home}</Text>
          </Pressable>
          {canRevive && <Pressable testID="revive-button" accessibilityRole="button" accessibilityLabel={ko.revive} onPress={onRevive}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>{ko.revive}</Text>
          </Pressable>}
        </View>
        {awardedNames.length > 0 && <View testID="character-unlock-notice" style={styles.notice}>
          <Text accessibilityLiveRegion="polite" style={styles.noticeText}>{ko.characterUnlocked}: {awardedNames.join(', ')}</Text>
        </View>}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: ui.gutter, backgroundColor: palette.overlay, zIndex: 4 },
  card: { width: '100%', maxWidth: 380, maxHeight: '100%', borderRadius: 26, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' },
  scroll: { flexShrink: 1, paddingVertical: 8 },
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 28 },
  title: { color: palette.ink, fontSize: 21, lineHeight: 29, fontWeight: '800', textAlign: 'center' },
  scoreBlock: { alignItems: 'center', marginTop: 15 },
  label: { color: palette.muted, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  score: { color: palette.ink, fontSize: 47, lineHeight: 57, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  success: { color: palette.scoreSuccess },
  record: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 13, backgroundColor: palette.background, marginTop: 10, marginBottom: 18 },
  best: { color: palette.ink, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'column', gap: 10 },
  button: { width: '100%', minHeight: 50, flexShrink: 0, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.paper,
    alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: palette.ink, fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  retry: { backgroundColor: palette.mint },
  notice: { backgroundColor: palette.mint, padding: 12, borderRadius: 13, marginTop: 12 },
  noticeText: { color: palette.ink, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
