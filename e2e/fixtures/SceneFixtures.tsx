import { memo, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { CHARACTERS, type CharacterId } from '../../src/characters/catalog';
import { ko } from '../../src/i18n/ko';
import { GameScene } from '../../src/scene/GameScene';
import { getSceneModel, getViewport } from '../../src/scene/layout';
import { NYANG_RIG, NYANG_WALK, NyangCharacter } from '../../src/scene/NyangCharacter';
import type { SceneFrame } from '../../src/scene/types';
import { palette } from '../../src/theme/tokens';

export const FIXTURE_NOTICE = 'TEST FIXTURE — 합성 상태 / iOS 스크린샷 아님';
const DISTANCES = [0, 14.9, 15, 50, 50.5, 51, 100, 250] as const;
const ANGLES = [-Math.PI / 3, -0.55, 0, 0.55, Math.PI / 3] as const;
const POSES = [
  { id: 'left', angle: -0.55, fallen: false },
  { id: 'right', angle: 0.55, fallen: false },
  { id: 'neutral', angle: 0, fallen: false },
  { id: 'walk-left', angle: 0, fallen: false },
  { id: 'walk-right', angle: 0, fallen: false },
  { id: 'steep-left', angle: -Math.PI / 3, fallen: false },
  { id: 'steep-right', angle: Math.PI / 3, fallen: false },
  { id: 'fallen-left', angle: -1.134464014, fallen: true },
  { id: 'fallen-right', angle: 1.134464014, fallen: true },
] as const;
const PHONE_SIZES = [{ width: 844, height: 390 }, { width: 667, height: 375 }] as const;

function syntheticFrame(distanceM: number, angleRad: number, hasCoffee: boolean): SceneFrame {
  return { distanceM, elapsedSeconds: 0, angleRad, angularVelocity: 0,
    hasCoffee, protectionSeconds: 0, playing: false, fallen: false, seed: 7 };
}

function FixtureStamp() {
  return <View pointerEvents="none" style={styles.stamp}><Text style={styles.stampText}>{FIXTURE_NOTICE}</Text></View>;
}

interface ChipProps { children: string; selected: boolean; testID: string; onPress(): void }
function Chip({ children, selected, testID, onPress }: ChipProps) {
  return <Pressable testID={testID} accessibilityRole="button" aria-pressed={selected} onPress={onPress}
    style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
    <Text style={styles.chipText}>{children}</Text>
  </Pressable>;
}

const PoseCard = memo(function PoseCard({ characterId, name, coffee, angle, fallen, pose, scale }: {
  characterId: CharacterId; name: string; coffee: boolean; angle: number;
  fallen: boolean; pose: string; scale: number;
}) {
  const poseDistance = pose === 'walk-left' ? NYANG_WALK.metersPerCycle / 4
    : pose === 'walk-right' ? NYANG_WALK.metersPerCycle * 3 / 4 : 0;
  // Pose phase and coffee are intentionally independent synthetic renderer inputs.
  const frame = useSharedValue<SceneFrame>({ ...syntheticFrame(poseDistance, angle, coffee), fallen });
  const poseId = `${characterId}-${coffee ? 'coffee' : 'empty'}-${pose}`;
  // A wider crop includes the full silhouette at the 82-degree terminal pose.
  // This is a crop at game scale, not a enlarged character portrait.
  return (
    <View testID={`fixture-pose-${poseId}`} style={styles.poseCard}>
      <Text style={styles.poseName}>{name}</Text>
      <Text style={styles.poseDescription}>{coffee ? '커피 있음' : '커피 없음'} · angle {angle.toFixed(2)} rad{fallen ? ' · 넘어진 뒤' : ''}{pose.startsWith('walk-') ? ` · ${pose}` : ''}</Text>
      <View style={{ width: 480 * scale, height: 350 * scale, backgroundColor: palette.sky }}>
        <Svg width={480 * scale} height={350 * scale} viewBox="-240 -235 480 350" preserveAspectRatio="xMidYMid meet">
          <NyangCharacter frame={frame} characterId={characterId} reduceMotion />
        </Svg>
      </View>
      <Text style={styles.poseStamp}>{FIXTURE_NOTICE}</Text>
    </View>
  );
});

/** A separate web-only art fixture, never registered or imported by the real App. */
export function SceneFixtures() {
  const [distance, setDistance] = useState<number>(0);
  const [angle, setAngle] = useState<number>(0);
  const [characterId, setCharacterId] = useState<CharacterId>('rookie');
  const [phoneIndex, setPhoneIndex] = useState(0);
  const phone = PHONE_SIZES[phoneIndex];
  const scale = getViewport(phone.width, phone.height).scale;
  const model = getSceneModel(distance);
  const frame = useSharedValue<SceneFrame>(syntheticFrame(distance, angle, distance >= 15));
  useEffect(() => {
    frame.value = syntheticFrame(distance, angle, distance >= 15);
  }, [frame, distance, angle]);

  return (
    <ScrollView testID="scene-fixtures" style={styles.root} contentContainerStyle={styles.page}>
      <Text accessibilityRole="header" style={styles.title}>냥대리 장면 · 정적 시각 검사</Text>
      <Text testID="fixture-disclaimer" style={styles.notice}>{FIXTURE_NOTICE}</Text>
      <Text style={styles.description}>아래 값은 렌더러에 직접 전달한 합성 상태입니다. 실제 플레이·해금·점수 달성 증거가 아닙니다.</Text>
      <View style={styles.controls}>
        <Text style={styles.sectionLabel}>Phone viewport / SVG contain</Text>
        <View style={styles.chips}>{PHONE_SIZES.map((size, index) => <Chip key={size.width} testID={`fixture-phone-${size.width}`}
          selected={phoneIndex === index} onPress={() => setPhoneIndex(index)}>{`${size.width} × ${size.height}`}</Chip>)}</View>
        <Text style={styles.sectionLabel}>합성 거리</Text>
        <View style={styles.chips}>{DISTANCES.map(value => <Chip key={value} testID={`fixture-distance-${value}`}
          selected={distance === value} onPress={() => setDistance(value)}>{`${value} m`}</Chip>)}</View>
        <Text style={styles.sectionLabel}>전체 장면의 캐릭터 / 기울기</Text>
        <View style={styles.chips}>{CHARACTERS.map(character => <Chip key={character.id} testID={`fixture-character-${character.id}`}
          selected={characterId === character.id} onPress={() => setCharacterId(character.id)}>{ko[character.nameKey]}</Chip>)}
          {ANGLES.map(value => <Chip key={value} testID={`fixture-angle-${value}`} selected={angle === value}
            onPress={() => setAngle(value)}>{`${value.toFixed(2)} rad`}</Chip>)}
        </View>
      </View>

      <View style={styles.sceneSection}>
        <Text testID="fixture-scene-label" style={styles.sceneLabel}>
          합성 {distance} m · {characterId} · coffee {distance >= 15 ? 'on' : 'off'} · {model.stage} · officeBlend {model.officeBlend.toFixed(2)}
        </Text>
        <Text style={styles.description}>아래 캔버스는 {phone.width}×{phone.height} CSS px입니다. 좁은 화면에서는 가로로 스크롤하며 원래 배율을 유지합니다.</Text>
        <ScrollView horizontal style={styles.sceneScroller} contentContainerStyle={styles.sceneScrollContent}>
          <View testID="fixture-phone-scene" style={[styles.phone, { width: phone.width, height: phone.height }]}>
            <GameScene frame={frame} characterId={characterId} reduceMotion />
            <FixtureStamp />
          </View>
        </ScrollView>
      </View>

      <Text accessibilityRole="header" style={styles.sectionTitle}>54개 포즈 · 3 캐릭터 × 커피 2 상태 × 기본·걷기·큰 기울기·넘어짐</Text>
      <Text testID="fixture-pose-scale" style={styles.description}>
        실제 게임 배율 {scale.toFixed(4)} = min({phone.width}/960, {phone.height}/540). {NYANG_RIG.height}px 캐릭터가 화면에서 약 {(NYANG_RIG.height * scale).toFixed(1)}px 높이입니다.
      </Text>
      <View testID="fixture-pose-grid" style={styles.poseGrid}>
        {CHARACTERS.flatMap(character => [false, true].flatMap(coffee => POSES.map(pose => (
          <PoseCard key={`${character.id}-${coffee}-${pose.id}`} characterId={character.id} name={ko[character.nameKey]}
            coffee={coffee} angle={pose.angle} fallen={pose.fallen} pose={pose.id} scale={scale} />
        ))))}
      </View>
      <Text style={styles.description}>{FIXTURE_NOTICE} · 오디오·입력·엔진 시간·저장·광고·랭킹은 이 페이지에 연결하지 않았습니다.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EAE9E5' },
  page: { padding: 20, gap: 12, alignItems: 'stretch' },
  title: { color: palette.ink, fontSize: 27, lineHeight: 36, fontWeight: '800' },
  notice: { color: '#704516', backgroundColor: '#FFF1CE', padding: 12, borderRadius: 9, fontWeight: '800', fontSize: 15 },
  description: { color: palette.ink, fontSize: 13, lineHeight: 20 },
  controls: { backgroundColor: palette.paper, padding: 16, gap: 10, borderRadius: 16 },
  sectionLabel: { color: palette.ink, fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 11, backgroundColor: palette.background, borderWidth: 1, borderColor: palette.border },
  chipSelected: { backgroundColor: palette.mint, borderColor: palette.scoreSuccess },
  chipText: { color: palette.ink, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  sceneSection: { gap: 8 },
  sceneLabel: { color: palette.ink, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  sceneScroller: { flexGrow: 0 },
  sceneScrollContent: { paddingVertical: 4 },
  phone: { backgroundColor: palette.background, overflow: 'hidden' },
  stamp: { position: 'absolute', right: 8, bottom: 7, backgroundColor: '#FFF1E6', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 4 },
  stampText: { color: '#704516', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  sectionTitle: { color: palette.ink, fontSize: 21, lineHeight: 28, fontWeight: '800', marginTop: 8 },
  poseGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 },
  poseCard: { backgroundColor: palette.paper, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: palette.border, gap: 5 },
  poseName: { color: palette.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  poseDescription: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  poseStamp: { color: '#704516', fontSize: 9, lineHeight: 13, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
