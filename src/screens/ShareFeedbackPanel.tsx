import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ko } from '../i18n/ko';
import type { ShareResult } from '../services/share';
import { palette } from '../theme/tokens';

export function ShareFeedbackPanel({ result, onClose }: {
  result: ShareResult | null; onClose(): void;
}): React.JSX.Element | null {
  if (!result) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} supportedOrientations={['landscape']}>
      <View style={styles.backdrop} accessibilityViewIsModal role="dialog" aria-modal>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={styles.title}>
              {result.status === 'copied' ? ko.shareCopied : ko.shareManual}
            </Text>
            <Text selectable style={styles.text}>{result.text}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={ko.shareClose} onPress={onClose} style={styles.button}>
              <Text style={styles.title}>{ko.shareClose}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: palette.overlay, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { maxHeight: '100%', width: '100%', maxWidth: 490, backgroundColor: palette.paper, borderRadius: 24 },
  content: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28, gap: 20 },
  title: { fontSize: 18, fontWeight: '700', color: palette.ink, textAlign: 'center' },
  text: { fontSize: 16, lineHeight: 25, color: palette.ink },
  button: { minHeight: 48, borderRadius: 16, justifyContent: 'center', backgroundColor: palette.mint, padding: 12 },
});
