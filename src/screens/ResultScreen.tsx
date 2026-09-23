import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHARACTERS, type CharacterId } from '../characters/catalog';
import { ko } from '../i18n/ko';
import type { SubmitResult } from '../online/contracts';
import type { RankSubmissionState } from '../online/types';
import { palette, ui } from '../theme/tokens';

export interface ResultScreenProps {
  score: number; bestScore: number; canRevive: boolean;
  onRetry(): void; onHome(): void; onShare(): void; onRevive(): void;
  onSettings?(): void; onCharacters?(): void; newlyUnlocked?: readonly CharacterId[];
  onLeaderboard?(): void; onNickname?(): void; startBusy?: boolean;
  submissionState?: RankSubmissionState; receipt?: SubmitResult | null; onRetrySubmission?(): void;
}

export function ResultScreen({ score, bestScore, canRevive, onRetry, onHome, onShare, onRevive,
  onSettings, onCharacters, newlyUnlocked = [], onLeaderboard, onNickname, startBusy = false,
  submissionState, receipt, onRetrySubmission }: ResultScreenProps) {
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
        {canRevive && <Pressable testID="revive-button" accessibilityRole="button" accessibilityLabel={ko.revive} onPress={onRevive}
          style={({ pressed }) => [styles.revive, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>{ko.revive}</Text>
        </Pressable>}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={ko.home} onPress={onHome}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>{ko.home}</Text>
          </Pressable>
          <Pressable testID="retry-button" accessibilityRole="button" accessibilityLabel={ko.retry} onPress={onRetry}
            disabled={startBusy} accessibilityState={{ disabled: startBusy, busy: startBusy }}
            style={({ pressed }) => [styles.primary, startBusy && styles.pressed, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>{startBusy ? ko.starting : ko.retry}</Text>
          </Pressable>
        </View>
        {awardedNames.length > 0 && <View testID="character-unlock-notice" style={styles.notice}>
          <Text accessibilityLiveRegion="polite" style={styles.noticeText}>{ko.characterUnlocked}: {awardedNames.join(', ')}</Text>
        </View>}
        {submissionState && <View testID="ranking-submission-status" style={styles.notice}>
          <Text accessibilityLiveRegion="polite" style={styles.noticeText}>{submissionState === 'submitted' && receipt
            ? ko.rankingSubmitted : submissionState === 'pending' || submissionState === 'recording' ? ko.rankingPending : ko.rankingLocal}</Text>
          {submissionState === 'submitted' && receipt && <Text testID="ranking-receipt" style={styles.noticeText}>
            {ko.rankingVerifiedScore} {receipt.score}% · {ko.rankingBestScore} {receipt.bestScore}%{receipt.rank === null ? '' : ` · ${receipt.rank}위`}
          </Text>}
          {submissionState === 'pending' && onRetrySubmission && <Pressable testID="retry-ranking-submission" accessibilityRole="button"
            accessibilityLabel={ko.retrySubmission} onPress={onRetrySubmission} style={({ pressed }) => [styles.serviceButton, pressed && styles.pressed]}>
            <Text style={styles.serviceText}>{ko.retrySubmission}</Text>
          </Pressable>}
        </View>}
        <View style={styles.services}>
          {onLeaderboard && <Pressable testID="result-leaderboard" accessibilityRole="button" accessibilityLabel={ko.leaderboard}
            onPress={onLeaderboard} style={({ pressed }) => [styles.serviceButton, pressed && styles.pressed]}>
            <Text style={styles.serviceText}>{ko.leaderboard}</Text>
          </Pressable>}
          {onNickname && <Pressable testID="result-nickname" accessibilityRole="button" accessibilityLabel={ko.nicknameSet}
            onPress={onNickname} style={({ pressed }) => [styles.serviceButton, pressed && styles.pressed]}>
            <Text style={styles.serviceText}>{ko.nicknameSet}</Text>
          </Pressable>}
          <Pressable testID="result-share" accessibilityRole="button" accessibilityLabel={ko.share} onPress={onShare}
            style={({ pressed }) => [styles.serviceButton, pressed && styles.pressed]}>
            <Text style={styles.serviceText}>{ko.share}</Text>
          </Pressable>
          {onCharacters && <Pressable testID="result-characters" accessibilityRole="button"
            accessibilityLabel={awardedNames.length > 0 ? ko.characterSelect : ko.characters} onPress={onCharacters}
            style={({ pressed }) => [styles.serviceButton, pressed && styles.pressed]}>
            <Text style={styles.serviceText}>{awardedNames.length > 0 ? ko.characterSelect : ko.characters}</Text>
          </Pressable>}
          {onSettings && <Pressable testID="result-settings" accessibilityRole="button" accessibilityLabel={ko.settings} onPress={onSettings}
            style={({ pressed }) => [styles.serviceButton, pressed && styles.pressed]}>
            <Text style={styles.serviceText}>{ko.settings}</Text>
          </Pressable>}
        </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: ui.gutter, backgroundColor: palette.overlay, zIndex: 4 },
  card: { width: '100%', maxWidth: 380, maxHeight: '100%', borderRadius: 26, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' },
  scroll: { flexShrink: 1 },
  content: { padding: 20 },
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
  revive: { minHeight: ui.minTapSize, alignItems: 'center', justifyContent: 'center', marginTop: 9, marginBottom: 12, borderRadius: 14, backgroundColor: palette.lavender },
  services: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  serviceButton: { flex: 1, minWidth: 80, minHeight: ui.minTapSize, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: palette.border },
  serviceText: { color: palette.ink, fontSize: 12, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
  notice: { backgroundColor: palette.mint, padding: 12, borderRadius: 13, marginTop: 12 },
  noticeText: { color: palette.ink, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
