import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ko } from '../i18n/ko';
import { palette, ui } from '../theme/tokens';

export interface MockAdScreenProps { secondsRemaining: number; onCancel(): void }

/** This screen can only display engine time; it has no completion or reward callback. */
export function MockAdScreen({ secondsRemaining, onCancel }: MockAdScreenProps) {
  const seconds = Number.isFinite(secondsRemaining) ? Math.max(0, Math.ceil(secondsRemaining)) : 5;
  return (
    <View testID="mock-ad-screen" role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel={ko.mockAdTitle} style={styles.root}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>{ko.mockAdTitle}</Text>
          <Pressable testID="mock-ad-cancel" accessibilityRole="button" accessibilityLabel={ko.mockAdCancel}
            onPress={onCancel} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>{ko.close}</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.brand}>{ko.mockAdBrand}</Text>
          <Text style={styles.copy}>{ko.mockAdCopy}</Text>
          <Text testID="mock-ad-seconds" accessibilityLiveRegion="polite" style={styles.seconds}>{ko.mockAdRemaining} {seconds}초</Text>
          <Text style={styles.reward}>{ko.mockAdReward}</Text>
          <Text style={styles.note}>{ko.mockAdCancelHint}</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', padding: ui.gutter, backgroundColor: palette.overlay, zIndex: 6 },
  card: { width: '100%', maxWidth: 430, maxHeight: '100%', borderRadius: ui.radius, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.paper, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderColor: palette.border },
  title: { color: palette.muted, fontSize: 14, lineHeight: 22, fontWeight: '700', flexShrink: 1 },
  cancel: { minWidth: 52, minHeight: ui.minTapSize, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.background, borderRadius: 13 },
  cancelText: { color: palette.ink, fontSize: 14, fontWeight: '600' },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 28, alignItems: 'center', gap: 10 },
  brand: { color: palette.ink, fontSize: 28, lineHeight: 36, fontWeight: '800' },
  copy: { color: palette.muted, fontSize: 13, lineHeight: 21, textAlign: 'center' },
  seconds: { color: palette.scoreSuccess, fontSize: 22, lineHeight: 30, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 3 },
  reward: { color: palette.ink, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  note: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
