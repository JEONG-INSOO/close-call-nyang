import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ko } from '../i18n/ko';
import { hidePlayer, loadBlockedPlayers } from '../online/blockedPlayers';
import type { LeaderboardEntry, LeaderboardResponse, PlayerProfile, ReportReason } from '../online/contracts';
import { onlineErrorMessage, type RankingApi } from '../online/types';
import { palette } from '../theme/tokens';
import { onlineStyles as common } from './onlineStyles';
import { ServicePanelFrame } from './SettingsPanel';

export interface LeaderboardScreenProps {
  visible?: boolean; api: RankingApi | null; myProfile: PlayerProfile | null;
  onClose(): void; refreshKey?: number;
}

const SUPPORT_URL = 'https://github.com/JEONG-INSOO/close-call-nyang/issues';
const REFRESH_COOLDOWN_MS = 3000;
const REPORT_REASONS: readonly { value: ReportReason; label: string }[] = [
  { value: 'inappropriate', label: ko.reportInappropriate },
  { value: 'impersonation', label: ko.reportImpersonation },
  { value: 'other', label: ko.reportOther },
];

export function LeaderboardScreen({ visible = true, api, myProfile, onClose, refreshKey = 0 }: LeaderboardScreenProps) {
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false); const [cooldown, setCooldown] = useState(false);
  const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [menu, setMenu] = useState<LeaderboardEntry | null>(null);
  const [reporting, setReporting] = useState(false); const [reportBusy, setReportBusy] = useState(false);
  const request = useRef(0); const currentView = useRef(0); const loadingRef = useRef(false);
  const reportLock = useRef(false); const nextRefresh = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!api || loadingRef.current || Date.now() < nextRefresh.current) return;
    const generation = ++request.current;
    loadingRef.current = true; setLoading(true); setError(null);
    try {
      const value = await api.getLeaderboard();
      if (generation === request.current) setBoard(value);
    } catch (cause) {
      if (generation === request.current) setError(onlineErrorMessage(cause));
    } finally {
      if (generation === request.current) {
        loadingRef.current = false; setLoading(false); setCooldown(true);
        nextRefresh.current = Date.now() + REFRESH_COOLDOWN_MS;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { timer.current = null; setCooldown(false); }, REFRESH_COOLDOWN_MS);
      }
    }
  }, [api]);

  useEffect(() => {
    const view = ++currentView.current;
    request.current += 1; loadingRef.current = false; reportLock.current = false; nextRefresh.current = 0;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null; setCooldown(false); setBoard(null); setMenu(null); setReporting(false);
    setReportBusy(false); setNotice(null); setError(null); setLoading(false); setBlocked([]);
    if (visible) {
      void loadBlockedPlayers().then(ids => {
        if (view === currentView.current) setBlocked(previous => [...new Set([...ids, ...previous])].slice(-200));
      });
      void load();
    }
    return () => {
      currentView.current += 1; request.current += 1;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [visible, api, myProfile?.publicId, refreshKey, load]);

  const hide = async (entry: LeaderboardEntry) => {
    const view = currentView.current;
    // The row disappears immediately; disk latency must not expose it again.
    setBlocked(previous => [...previous.filter(id => id !== entry.publicId), entry.publicId].slice(-200));
    setMenu(null); setReporting(false);
    const result = await hidePlayer(entry.publicId, blocked);
    if (view === currentView.current) {
      setBlocked(previous => [...new Set([...result.ids, ...previous])].slice(-200));
      setNotice(result.saved ? ko.hiddenPlayerNotice : ko.hiddenPlayerMemoryOnly);
    }
  };

  const report = async (reason: ReportReason) => {
    if (!api || !menu || !myProfile || reportLock.current) return;
    const view = currentView.current; const target = menu.publicId;
    reportLock.current = true; setReportBusy(true); setError(null);
    try {
      await api.reportNickname(target, reason);
      if (view === currentView.current) { setNotice(ko.reportNotice); setReporting(false); setMenu(null); }
    } catch (cause) {
      if (view === currentView.current) setError(onlineErrorMessage(cause));
    } finally {
      if (view === currentView.current) { reportLock.current = false; setReportBusy(false); }
    }
  };

  const openSupport = async () => {
    try { await Linking.openURL(SUPPORT_URL); }
    catch { setNotice(ko.supportUnavailable); }
  };

  const row = (entry: LeaderboardEntry, own = false) => (
    <View key={`${own ? 'own' : 'row'}-${entry.publicId}`} testID={`${own ? 'my-rank' : 'rank-row'}-${entry.publicId}`}
      style={[styles.rankRow, entry.isMe && styles.mine]}>
      <Text style={styles.rank}>{entry.rank}</Text>
      <View style={styles.nameBlock}>
        <Text style={styles.name}>{entry.nickname}{entry.isMe ? ` · ${ko.rankMe}` : ''}</Text>
      </View>
      <Text style={styles.score}>{entry.score}%</Text>
      {!entry.isMe && <Pressable testID={`rank-menu-${entry.publicId}`} accessibilityRole="button"
        accessibilityLabel={`${entry.nickname} ${ko.rankRowActions}`} disabled={reportBusy}
        onPress={() => { setMenu(menu?.publicId === entry.publicId ? null : entry); setReporting(false); setNotice(null); }}
        style={({ pressed }) => [styles.menuButton, pressed && common.pressed]}>
        <Text style={styles.menuText}>···</Text>
      </Pressable>}
    </View>
  );
  const entries = board?.entries.filter(entry => entry.isMe || !blocked.includes(entry.publicId)) ?? [];
  const updated = board && !Number.isNaN(Date.parse(board.fetchedAt)) ? new Date(board.fetchedAt).toLocaleString('ko-KR') : null;
  return (
    <ServicePanelFrame visible={visible} title={ko.leaderboard} testID="leaderboard-panel" onClose={onClose} maxWidth={680}>
      <Text style={common.copy}>{ko.rankHint}</Text>
      {!api && <Text testID="leaderboard-unconfigured" style={common.notice}>{ko.rankUnavailable}</Text>}
      {api && <View style={common.row}>
        <Pressable testID="leaderboard-refresh" accessibilityRole="button" accessibilityLabel={error ? ko.rankRetry : ko.rankRefresh}
          disabled={loading || cooldown} accessibilityState={{ disabled: loading || cooldown, busy: loading }}
          onPress={() => { void load(); }} style={({ pressed }) => [common.button, (loading || cooldown) && common.disabled, pressed && common.pressed]}>
          <Text style={common.buttonText}>{error ? ko.rankRetry : ko.rankRefresh}</Text>
        </Pressable>
        {updated && <Text testID="leaderboard-updated" style={styles.updated}>{ko.rankUpdated}: {updated}</Text>}
      </View>}
      {api && <Text style={common.copy}>{ko.rankCacheHint}</Text>}
      {loading && <Text accessibilityLiveRegion="polite" style={common.notice}>{ko.rankLoading}</Text>}
      {error && <Text testID="leaderboard-error" accessibilityRole="alert" style={common.error}>{error}</Text>}
      {notice && <Text accessibilityLiveRegion="polite" style={common.notice}>{notice}</Text>}
      {board && <>
        <View style={styles.columnRow}>
          <Text style={styles.columnRank}>{ko.rankColumn}</Text><Text style={styles.columnName}>{ko.nickname}</Text><Text style={styles.columnScore}>{ko.rankScoreColumn}</Text>
        </View>
        {entries.length === 0 && <Text testID="leaderboard-empty" style={common.notice}>{board.entries.length === 0 ? ko.rankEmpty : ko.rankHiddenEmpty}</Text>}
        {entries.map(entry => row(entry))}
        <Text accessibilityRole="header" style={common.label}>{ko.rankMine}</Text>
        {board.me ? row(board.me, true) : <Text style={common.copy}>{ko.rankNoMine}</Text>}
      </>}
      {menu && <View testID="rank-row-menu" style={styles.actions}>
        <Text style={common.label}>{menu.nickname}</Text>
        {!reporting && <>
          <Pressable testID="nickname-report" accessibilityRole="button" accessibilityLabel={ko.nicknameReport}
            disabled={!myProfile} accessibilityState={{ disabled: !myProfile }} onPress={() => setReporting(true)}
            style={({ pressed }) => [common.button, !myProfile && common.disabled, pressed && common.pressed]}>
            <Text style={common.buttonText}>{ko.nicknameReport}</Text>
          </Pressable>
          {!myProfile && <Text style={common.copy}>{ko.reportProfileRequired}</Text>}
          <Pressable testID="hide-player" accessibilityRole="button" accessibilityLabel={ko.hidePlayer} onPress={() => { void hide(menu); }}
            style={({ pressed }) => [common.button, pressed && common.pressed]}><Text style={common.buttonText}>{ko.hidePlayer}</Text></Pressable>
        </>}
        {reporting && <>
          {reportBusy && <Text style={common.copy}>{ko.reportBusy}</Text>}
          {REPORT_REASONS.map(reason => <Pressable key={reason.value} testID={`report-reason-${reason.value}`}
            accessibilityRole="button" accessibilityLabel={reason.label} disabled={reportBusy}
            accessibilityState={{ disabled: reportBusy, busy: reportBusy }} onPress={() => { void report(reason.value); }}
            style={({ pressed }) => [common.button, reportBusy && common.disabled, pressed && common.pressed]}>
            <Text style={common.buttonText}>{reason.label}</Text>
          </Pressable>)}
        </>}
        <Pressable accessibilityRole="button" accessibilityLabel={ko.cancel} disabled={reportBusy}
          onPress={() => { setMenu(null); setReporting(false); }} style={common.button}><Text style={common.buttonText}>{ko.cancel}</Text></Pressable>
      </View>}
      <Pressable testID="ranking-support" accessibilityRole="link" accessibilityLabel={ko.support} onPress={() => { void openSupport(); }} style={common.button}>
        <Text style={common.buttonText}>{ko.support}</Text>
      </Pressable>
      <Text style={common.copy}>{ko.supportNotice}</Text>
    </ServicePanelFrame>
  );
}

const styles = StyleSheet.create({
  columnRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 7, gap: 8, backgroundColor: palette.background, borderRadius: 8 },
  columnRank: { width: 45, fontSize: 12, color: palette.muted },
  columnName: { flex: 1, fontSize: 12, color: palette.muted },
  columnScore: { fontSize: 12, color: palette.muted, minWidth: 70, textAlign: 'right', marginRight: 44 },
  rankRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 10, minHeight: 48, borderBottomWidth: 1, borderColor: palette.border, borderRadius: 8 },
  mine: { backgroundColor: palette.mint },
  rank: { width: 45, color: palette.ink, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  nameBlock: { flex: 1 },
  name: { color: palette.ink, fontSize: 14, lineHeight: 21 },
  score: { color: palette.ink, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'], minWidth: 60, textAlign: 'right' },
  menuButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  menuText: { color: palette.ink, fontSize: 22, fontWeight: '800' },
  updated: { color: palette.muted, fontSize: 11, lineHeight: 18, flexShrink: 1 },
  actions: { backgroundColor: palette.background, padding: 12, borderRadius: 12, gap: 8 },
});
