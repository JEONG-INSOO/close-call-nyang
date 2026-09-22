import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { NyangCharacter, type EmployeePose } from './NyangCharacter';
import type { SceneFrame } from './types';

// Each card is the actual game renderer fed a fixed synthetic frame.
const POSES = [
  { id: 'walk', label: '활기찬 출근', pose: 'walk', angleRad: 0, hasCoffee: false },
  { id: 'run', label: '신입의 질주', pose: 'run', angleRad: 0.16, hasCoffee: false },
  { id: 'coffee', label: '커피 한 잔', pose: 'game', angleRad: 0, hasCoffee: true },
  { id: 'alarm', label: '어어어?!', pose: 'game', angleRad: 0.8, hasCoffee: false },
] as const;

const EmployeePoseCard = memo(function EmployeePoseCard({ id, label, pose, angleRad, hasCoffee }: {
  id: string; label: string; pose: EmployeePose; angleRad: number; hasCoffee: boolean;
}) {
  const frame = useSharedValue<SceneFrame>({ distanceM: 0, elapsedSeconds: 0,
    angleRad, angularVelocity: 0, hasCoffee,
    protectionSeconds: 0, playing: false, fallen: false, seed: 1 });
  return <View testID={`employee-pose-${id}`} style={styles.card}>
    <Svg width={240} height={208} viewBox="-160 -250 380 330">
      <NyangCharacter frame={frame} reduceMotion characterId="rookie" pose={pose} />
    </Svg>
    <Text style={styles.label}>{label}</Text>
  </View>;
});

/** Art-only sheet of the actual game renderer. No engine, timers, unlocks or score. */
export function EmployeeCharacterSheet() {
  return <View testID="employee-sheet" style={styles.sheet}>
    {POSES.map(card => <EmployeePoseCard key={card.id} {...card} />)}
  </View>;
}
const styles = StyleSheet.create({
  sheet: { width: 544, maxWidth: '100%', padding: 16, gap: 16, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#FAF8F3', borderRadius: 16 },
  card: { width: 248, alignItems: 'center', paddingBottom: 12 },
  label: { color: '#515967', fontSize: 13, lineHeight: 20, fontWeight: '600' },
});
