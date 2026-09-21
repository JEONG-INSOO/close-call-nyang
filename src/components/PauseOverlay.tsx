import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ko } from '../i18n/ko';
import { palette, ui } from '../theme/tokens';

export interface PauseOverlayProps { onResume(): void; onHome(): void; onSettings?(): void }

export function PauseOverlay({ onResume, onHome, onSettings }: PauseOverlayProps) {
  return (
    <View testID="pause-overlay" style={styles.root} accessibilityViewIsModal>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>{ko.pausedTitle}</Text>
        <Text style={styles.description}>{ko.pausedDescription}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={ko.resume} onPress={onResume}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          <Text style={styles.primaryText}>{ko.resume}</Text>
        </Pressable>
        <View style={styles.row}>
          <Pressable accessibilityRole="button" accessibilityLabel={ko.home} onPress={onHome}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>{ko.home}</Text>
          </Pressable>
          {onSettings && <Pressable accessibilityRole="button" accessibilityLabel={ko.settings} onPress={onSettings}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>{ko.settings}</Text>
          </Pressable>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: ui.gutter, backgroundColor: palette.overlay, zIndex: 5 },
  card: { width: '100%', maxWidth: 340, padding: 24, borderRadius: ui.radius, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.border, gap: 12 },
  title: { color: palette.ink, fontSize: 26, lineHeight: 34, fontWeight: '800', textAlign: 'center' },
  description: { color: palette.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 5 },
  primary: { minHeight: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: palette.mint, paddingHorizontal: 14 },
  primaryText: { color: palette.ink, fontSize: 17, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10 },
  secondary: { minHeight: ui.minTapSize, flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: palette.border },
  secondaryText: { color: palette.ink, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
