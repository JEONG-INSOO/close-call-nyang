import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ko } from '../i18n/ko';
import { palette } from '../theme/tokens';

export interface TitleScreenProps { bestScore: number; onStart(): void; onSettings(): void; onCharacters?(): void }

export function TitleScreen({ bestScore, onStart, onSettings, onCharacters }: TitleScreenProps) {
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
          style={({ pressed }) => [styles.start, pressed && styles.pressed]}>
          <Text style={styles.startText}>{ko.start}</Text>
          <Text style={styles.arrow} accessibilityElementsHidden>→</Text>
        </Pressable>
        <View style={styles.services}>
          {onCharacters && <Pressable testID="title-characters" accessibilityRole="button" accessibilityLabel={ko.characters}
            onPress={onCharacters} style={({ pressed }) => [styles.serviceButton, pressed && styles.pressed]}>
            <Text style={styles.serviceText}>{ko.characters}</Text>
          </Pressable>}
          <Pressable testID="title-settings" accessibilityRole="button" accessibilityLabel={ko.settings}
            onPress={onSettings} style={({ pressed }) => [styles.serviceButton, pressed && styles.pressed]}>
            <Text style={styles.serviceText}>{ko.settings}</Text>
          </Pressable>
        </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'flex-end', padding: 16, zIndex: 4 },
  card: { width: '100%', maxWidth: 352, maxHeight: '100%', backgroundColor: palette.paper, borderRadius: 28, borderWidth: 1, borderColor: palette.border, overflow: 'hidden' },
  scroll: { flexShrink: 1 },
  content: { padding: 20 },
  accent: { width: 34, height: 6, borderRadius: 3, backgroundColor: palette.lavender, marginBottom: 9 },
  title: { fontSize: 31, lineHeight: 42, fontWeight: '900', color: palette.ink, letterSpacing: -1.2 },
  description: { fontSize: 14, lineHeight: 22, color: palette.muted, marginTop: 5 },
  record: { marginTop: 14, marginBottom: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: palette.background },
  recordLabel: { color: palette.muted, fontSize: 13, fontWeight: '600' },
  recordValue: { color: palette.ink, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  start: { minHeight: 54, borderRadius: 17, backgroundColor: palette.mint, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  startText: { color: palette.ink, fontSize: 18, fontWeight: '800' },
  arrow: { color: palette.ink, fontSize: 25 },
  services: { flexDirection: 'row', gap: 10, marginTop: 10 },
  serviceButton: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: palette.border },
  serviceText: { color: palette.ink, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
