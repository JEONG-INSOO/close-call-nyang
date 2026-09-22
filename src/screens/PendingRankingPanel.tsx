import { Pressable, Text } from 'react-native';
import { ko } from '../i18n/ko';
import { onlineStyles as styles } from './onlineStyles';
import { ServicePanelFrame } from './SettingsPanel';

export interface PendingRankingPanelProps {
  visible: boolean; busy?: boolean; error?: string | null;
  onRetry(): void; onStartLocal(): void; onDiscardAndStart(): void; onClose(): void;
}

export function PendingRankingPanel({ visible, busy = false, error, onRetry, onStartLocal, onDiscardAndStart, onClose }: PendingRankingPanelProps) {
  return (
    <ServicePanelFrame visible={visible} title={ko.pendingRankingTitle} testID="pending-ranking-panel" onClose={onClose} closeDisabled={busy}>
      <Text style={styles.notice}>{ko.pendingRankingDescription}</Text>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {[
        { id: 'pending-ranking-retry', label: ko.retrySubmission, action: onRetry, primary: true },
        { id: 'pending-ranking-local', label: ko.startLocal, action: onStartLocal },
        { id: 'pending-ranking-discard', label: ko.discardPendingAndStart, action: onDiscardAndStart },
      ].map(button => <Pressable key={button.id} testID={button.id} accessibilityRole="button" accessibilityLabel={button.label}
        disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={button.action}
        style={({ pressed }) => [styles.button, button.primary && styles.primary, busy && styles.disabled, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>{button.label}</Text>
      </Pressable>)}
      <Text style={styles.copy}>{ko.pendingDiscardNotice}</Text>
    </ServicePanelFrame>
  );
}
