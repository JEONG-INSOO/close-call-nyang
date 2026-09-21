import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { EventId, WorkEvent } from '../game/types';
import { ko } from '../i18n/ko';
import { palette, ui } from '../theme/tokens';

export interface GameHudProps {
  score: number; event: WorkEvent | null; onPause(): void; canPause: boolean;
}

const EVENT_LABELS: Record<EventId, string> = {
  coffeeRush: ko.eventCoffeeRush, lateCommute: ko.eventLateCommute,
  urgentEdit: ko.eventUrgentEdit, bossCall: ko.eventBossCall, longMeeting: ko.eventLongMeeting,
};

/** Text updates on controller publications, not on every animation frame. */
export const GameHud = memo(function GameHud({ score, event, onPause, canPause }: GameHudProps) {
  const visibleScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  const eventText = event ? `${event.phase === 'warning' ? ko.eventWarning : ko.eventActive} · ${EVENT_LABELS[event.id]}` : '';
  const directionText = event?.direction === -1 ? ko.directionLeft : ko.directionRight;
  return (
    <View testID="game-hud" style={styles.root} pointerEvents="box-none">
      <View style={styles.topRow} pointerEvents="box-none">
        <View testID="score-card" style={styles.scoreCard} accessible accessibilityLabel={`${ko.scoreLabel} ${visibleScore}%`}>
          <Text style={styles.label}>{ko.scoreLabel}</Text>
          <Text testID="game-score" numberOfLines={1} adjustsFontSizeToFit style={[styles.score, visibleScore >= 100 && styles.success]}>{visibleScore}%</Text>
        </View>
        <Pressable testID="pause-button" accessibilityRole="button" accessibilityLabel={ko.pause}
          accessibilityState={{ disabled: !canPause }} disabled={!canPause} onPress={onPause}
          style={({ pressed }) => [styles.pause, pressed && styles.pressed, !canPause && styles.disabled]}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.pauseBars}>
            <View style={styles.pauseBar} /><View style={styles.pauseBar} />
          </View>
        </Pressable>
      </View>
      {event && (
        <View testID="event-notice" pointerEvents="none" style={styles.eventPosition}>
          <View accessible accessibilityRole="alert" accessibilityLiveRegion="polite"
            accessibilityLabel={`${eventText}, ${directionText}`} style={[styles.event, event.phase === 'active' && styles.eventActive]}>
            <Text style={styles.eventArrow} accessibilityElementsHidden>{event.direction === -1 ? '←' : '→'}</Text>
            <Text testID="event-label" style={styles.eventText}>{eventText}</Text>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { position: 'absolute', top: ui.gutter, left: ui.gutter, right: ui.gutter, zIndex: 2 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  scoreCard: { backgroundColor: palette.paper, borderColor: palette.border, borderWidth: 1, borderRadius: 19, paddingVertical: 10, paddingHorizontal: 17, width: 154 },
  label: { color: palette.muted, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  score: { color: palette.ink, fontSize: 28, lineHeight: 33, fontWeight: '800', fontVariant: ['tabular-nums'] },
  success: { color: palette.scoreSuccess },
  pause: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border, backgroundColor: palette.paper },
  pauseBars: { flexDirection: 'row', gap: 5 },
  pauseBar: { width: 5, height: 17, borderRadius: 2, backgroundColor: palette.ink },
  eventPosition: { position: 'absolute', left: 173, right: 65, top: 7, alignItems: 'center' },
  event: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.border, maxWidth: '100%' },
  eventActive: { backgroundColor: palette.peach },
  eventArrow: { color: palette.ink, fontSize: 22, lineHeight: 24, fontWeight: '700' },
  eventText: { color: palette.ink, fontSize: 13, lineHeight: 18, fontWeight: '600', flexShrink: 1 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
