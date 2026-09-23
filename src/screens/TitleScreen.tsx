import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ko } from '../i18n/ko';
import { palette } from '../theme/tokens';

export interface TitleScreenProps {
  bestScore: number; onStart(): void; onSettings(): void; onCharacters?(): void;
  onResume?(): void; resumeAvailable?: boolean;
  nickname?: string; onNickname?(): void; onLeaderboard?(): void; startBusy?: boolean; onlineNotice?: string | null;
}

export function TitleScreen({ bestScore, onStart, onSettings, onCharacters, onResume, resumeAvailable = false, nickname, onNickname, onLeaderboard,
  startBusy = false, onlineNotice }: TitleScreenProps) {
  const best = Number.isFinite(bestScore) ? Math.max(0, Math.floor(bestScore)) : 0;
  return (
    <View testID="title-screen" style={styles.root}>
      <View style={styles.card}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.accent} />
        <Text accessibilityRole="header" style={styles.title}>{ko.title}</Text>
        <Text style={styles.description}>{ko.titleDescription}</Text>
        <View style={styles.record} accessible accessibilityLabel={`${ko.bestLabel} ${best}%`}>
          <Text style={styles.recordLabel}>{ko.bestLabel}</Text>
          <Text testID="title-best" style={styles.recordValue}>{best}%</Text>
        </View>
        <Pressable testID="start-button" accessibilityRole="button" accessibilityLabel={ko.start} onPress={onStart}
          disabled={startBusy} accessibilityState={{ disabled: startBusy, busy: startBusy }}
          style={({ pressed }) => [styles.start, startBusy && styles.pressed, pressed && styles.pressed]}>
          <Text style={styles.startText}>{startBusy ? ko.starting : ko.start}</Text>
          <Text style={styles.arrow} accessibilityElementsHidden>→</Text>
        </Pressable>
        {resumeAvailable && onResume && <Pressable testID="resume-saved-button" accessibilityRole="button"
          accessibilityLabel={ko.resumeSaved} onPress={onResume}
          style={({ pressed }) => [styles.resumeSaved, pressed && styles.pressed]}>
          <Text style={styles.resumeSavedText}>{ko.resumeSaved}</Text>
        </Pressable>}
        <View style={styles.services}>
          {onNickname && <Pressable testID="title-nickname" accessibilityRole="button" accessibilityLabel={nickname ? `${ko.nicknameEdit}: ${nickname}` : ko.nicknameSet}
            onPress={onNickname} style={({ pressed }) => [styles.serviceButton, pressed && styles.pressed]}>
            <Text style={styles.serviceText}>{nickname || ko.nicknameSet}</Text>
          </Pressable>}
          {onLeaderboard && <Pressable testID="title-leaderboard" accessibilityRole="button" accessibilityLabel={ko.leaderboard}
            onPress={onLeaderboard} style={({ pressed }) => [styles.serviceButton, pressed && styles.pressed]}>
            <Text style={styles.serviceText}>{ko.leaderboard}</Text>
          </Pressable>}
          {onCharacters && <Pressable testID="title-characters" accessibilityRole="button" accessibilityLabel={ko.characters}
            onPress={onCharacters} style={({ pressed }) => [styles.serviceButton, pressed && styles.pressed]}>
            <Text style={styles.serviceText}>{ko.characters}</Text>
          </Pressable>}
          <Pressable testID="title-settings" accessibilityRole="button" accessibilityLabel={ko.settings}
            onPress={onSettings} style={({ pressed }) => [styles.serviceButton, pressed && styles.pressed]}>
            <Text style={styles.serviceText}>{ko.settings}</Text>
          </Pressable>
        </View>
        {onlineNotice && <Text accessibilityLiveRegion="polite" style={styles.onlineNotice}>{onlineNotice}</Text>}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'flex-end', padding: 16, zIndex: 4 },
  card: { width: '100%', maxWidth: 352, maxHeight: '100%', backgroundColor: palette.paper, borderRadius: 28, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 28 },
  accent: { width: 34, height: 6, borderRadius: 3, backgroundColor: palette.lavender, marginBottom: 9 },
  title: { fontSize: 31, lineHeight: 42, fontWeight: '900', color: palette.ink, letterSpacing: -1.2 },
  description: { fontSize: 14, lineHeight: 22, color: palette.muted, marginTop: 5 },
  record: { marginTop: 14, marginBottom: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: palette.background },
  recordLabel: { color: palette.muted, fontSize: 13, fontWeight: '600' },
  recordValue: { color: palette.ink, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  start: { minHeight: 54, borderRadius: 17, backgroundColor: palette.mint, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  startText: { color: palette.ink, fontSize: 18, fontWeight: '800' },
  resumeSaved: { minHeight: 48, marginTop: 10, borderRadius: 15, borderWidth: 1, borderColor: palette.border, justifyContent: 'center', alignItems: 'center' },
  resumeSavedText: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  arrow: { color: palette.ink, fontSize: 25 },
  services: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  serviceButton: { flexGrow: 1, flexBasis: '40%', minHeight: 44, padding: 8, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: palette.border },
  serviceText: { color: palette.ink, fontSize: 14, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  onlineNotice: { color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 10 },
  pressed: { opacity: 0.7 },
});
