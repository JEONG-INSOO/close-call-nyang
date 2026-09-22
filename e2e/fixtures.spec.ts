import type { Locator, TestInfo } from '@playwright/test';
import { test, expect } from './helpers';

const NOTICE = 'TEST FIXTURE — 합성 상태 / iOS 스크린샷 아님';
const DISTANCES = [0, 15, 50, 50.5, 51, 100] as const;
const CHARACTERS = ['rookie', 'diligent', 'veteran'] as const;
const PHONES = [{ width: 844, height: 390 }, { width: 667, height: 375 }] as const;
const POSES = [
  { id: 'left', angle: -0.55 }, { id: 'right', angle: 0.55 },
  { id: 'neutral', angle: 0 },
  { id: 'walk-left', angle: 0 }, { id: 'walk-right', angle: 0 },
  { id: 'steep-left', angle: -Math.PI / 3 }, { id: 'steep-right', angle: Math.PI / 3 },
  { id: 'fallen-left', angle: -1.134464014, renderedAngle: -82 * Math.PI / 180 },
  { id: 'fallen-right', angle: 1.134464014, renderedAngle: 82 * Math.PI / 180 },
] as const;

async function svgOpacity(locator: Locator): Promise<number> {
  return locator.evaluate(element => {
    const opacity = element.getAttribute('opacity');
    return opacity === null ? Number.NaN : Number(opacity);
  });
}

async function svgTranslateX(locator: Locator): Promise<number | null> {
  return locator.evaluate(element => (element as unknown as SVGGraphicsElement).transform.baseVal.consolidate()?.matrix.e ?? null);
}

async function saveFixture(locator: Locator, info: TestInfo, name: string) {
  await locator.scrollIntoViewIfNeeded();
  const path = info.outputPath(`${name}.png`);
  await locator.screenshot({ path, animations: 'disabled' });
  await info.attach(name, { path, contentType: 'image/png' });
}

for (const phone of PHONES) {
  test(`synthetic scene and 54 flat chibi poses at ${phone.width}x${phone.height}`, async ({ cleanPage: page }, info) => {
    test.skip(info.project.name !== 'desktop', 'Separate labeled art fixtures run once per size in the desktop project.');
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:4174/fixtures/');
    await expect(page.getByTestId('fixture-disclaimer')).toHaveText(NOTICE);
    const employeeSheet = page.getByTestId('employee-sheet');
    for (const id of ['walk', 'water', 'run', 'notes']) {
      const card = employeeSheet.getByTestId(`employee-pose-${id}`);
      await expect(card.getByTestId('badge-text')).toHaveText('ID: 001');
      await expect(card.getByTestId('grey-tabby-bright-eyes')).toHaveCount(1);
      await expect(card.getByTestId('water-bottle')).toHaveCount(id === 'water' ? 1 : 0);
      await expect(card.getByTestId('note-pad')).toHaveCount(id === 'notes' ? 1 : 0);
      await expect.poll(() => svgOpacity(card.getByTestId('cup-visibility'))).toBe(0);
      const fits = await card.locator('svg').evaluate(element => {
        const svg = element as SVGSVGElement;
        const root = svg.querySelector('[data-testid="nyang-root"]') as SVGGraphicsElement;
        const b = root.getBBox(), m = root.transform.baseVal.consolidate()!.matrix, v = svg.viewBox.baseVal;
        return [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
          .every(([x, y]) => { const px = m.a*x+m.c*y+m.e, py = m.b*x+m.d*y+m.f;
            return px-2 >= v.x && px+2 <= v.x+v.width && py-2 >= v.y && py+2 <= v.y+v.height; });
      });
      expect(fits, `Employee sheet pose ${id} must include the full transformed bounds and stroke`).toBe(true);
    }
    await saveFixture(employeeSheet, info, 'actual-svg-employee-sheet');
    await expect(page.getByTestId('fixture-pose-grid')).toBeVisible();
    await page.getByTestId(`fixture-phone-${phone.width}`).click();
    await expect(page.getByTestId(`fixture-phone-${phone.width}`)).toHaveAttribute('aria-pressed', 'true');

    const scale = Math.min(phone.width / 960, phone.height / 540);
    const scene = page.getByTestId('fixture-phone-scene');
    const canvas = scene.getByTestId('scene-canvas');
    await expect(canvas).toBeVisible();
    await expect(scene.getByText(NOTICE, { exact: true })).toBeVisible();
    await expect.poll(async () => (await scene.boundingBox())?.width).toBe(phone.width);
    await expect.poll(async () => (await scene.boundingBox())?.height).toBe(phone.height);
    await expect.poll(async () => (await canvas.boundingBox())?.width).toBeCloseTo(960 * scale, 1);
    await expect.poll(async () => (await canvas.boundingBox())?.height).toBeCloseTo(540 * scale, 1);
    await expect(page.getByTestId('fixture-pose-scale')).toContainText(`배율 ${scale.toFixed(4)}`);

    for (const distance of DISTANCES) {
      await page.getByTestId(`fixture-distance-${distance}`).click();
      const stage = distance >= 51 ? 'office' : 'street';
      const coffee = distance >= 15;
      const blend = Math.min(1, Math.max(0, distance - 50));
      await expect(page.getByTestId('fixture-scene-label')).toHaveText(
        `합성 ${distance} m · rookie · coffee ${coffee ? 'on' : 'off'} · ${stage} · officeBlend ${blend.toFixed(2)}`,
      );
      // Shared-value updates can land after React labels: inspect actual SVG output.
      await expect.poll(() => svgOpacity(scene.getByTestId('cup-visibility'))).toBe(coffee ? 1 : 0);
      await expect.poll(() => svgOpacity(scene.getByTestId('office-scene'))).toBe(blend);
      await expect.poll(() => svgTranslateX(scene.getByTestId('cafe'))).toBeCloseTo(270 + (15 - distance) * 120, 4);
      await expect.poll(() => svgTranslateX(scene.getByTestId('company-entrance'))).toBeCloseTo(270 + (50.5 - distance) * 120, 4);
      await expect(scene.getByTestId('face-rookie')).toHaveCount(1);
      await saveFixture(scene, info, `fixture-${phone.width}x${phone.height}-distance-${distance}`);
    }

    const grid = page.getByTestId('fixture-pose-grid');
    await expect(grid.locator('[data-testid^="fixture-pose-"]')).toHaveCount(54);
    for (const id of CHARACTERS) {
      for (const coffee of [false, true]) {
        for (const spec of POSES) {
          const { angle } = spec;
          const poseId = `${id}-${coffee ? 'coffee' : 'empty'}-${spec.id}`;
          const pose = page.getByTestId(`fixture-pose-${poseId}`);
          await expect(pose.getByText(NOTICE, { exact: true })).toBeVisible();
          await expect(pose.getByTestId(`face-${id}`)).toHaveCount(1);
          await expect(pose).toContainText(`${coffee ? '커피 있음' : '커피 없음'} · angle ${angle.toFixed(2)} rad`);
          await expect.poll(() => svgOpacity(pose.getByTestId('cup-visibility'))).toBe(coffee ? 1 : 0);
          if (id === 'rookie') {
            const fallen = spec.id.startsWith('fallen-');
            const leftSole = fallen ? 1 : spec.id === 'walk-left' ? 0.82 : 0;
            const rightSole = fallen ? 1 : spec.id === 'walk-right' ? 0.82 : 0;
            await expect.poll(() => svgOpacity(pose.getByTestId('paw-pads-left'))).toBeCloseTo(leftSole, 4);
            await expect.poll(() => svgOpacity(pose.getByTestId('paw-pads-right'))).toBeCloseTo(rightSole, 4);
          }
          await expect.poll(() => pose.getByTestId('nyang-root').evaluate(element => {
            const matrix = (element as unknown as SVGGraphicsElement).transform.baseVal.consolidate()?.matrix;
            return matrix ? Math.atan2(matrix.b, matrix.a) : Number.NaN;
          })).toBeCloseTo('renderedAngle' in spec ? spec.renderedAngle : angle, 4);
          const poseSvg = pose.locator('svg');
          await expect.poll(async () => (await poseSvg.boundingBox())?.width).toBeCloseTo(480 * scale, 1);
          await expect.poll(async () => (await poseSvg.boundingBox())?.height).toBeCloseTo(350 * scale, 1);
          // Compare actual SVG bounds, not just the React label, at extreme poses.
          const bounds = await pose.getByTestId('nyang-root').evaluate(element => {
            const node = element as unknown as SVGGraphicsElement;
            const box = node.getBBox();
            const matrix = node.transform.baseVal.consolidate()!.matrix;
            return [[box.x, box.y], [box.x + box.width, box.y],
              [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
              .map(([x, y]) => ({ x: matrix.a * x + matrix.c * y + matrix.e,
                y: matrix.b * x + matrix.d * y + matrix.f }));
          });
          for (const point of bounds) {
            expect(point.x).toBeGreaterThanOrEqual(-240);
            expect(point.x).toBeLessThanOrEqual(240);
            expect(point.y).toBeGreaterThanOrEqual(-235);
            expect(point.y).toBeLessThanOrEqual(115);
          }
          // Individual labeled crops preserve all poses even when a tall grid scrolls.
          await saveFixture(pose, info, `fixture-${phone.width}x${phone.height}-pose-${poseId}`);
        }
      }
    }
    await saveFixture(grid, info, `fixture-${phone.width}x${phone.height}-54-pose-grid`);
    await info.attach('fixture-evidence-scope', {
      body: JSON.stringify({ synthetic: true, iosScreenshot: false, actualPlayEvidence: false,
        browserViewport: { width: 1280, height: 900 }, phoneCanvas: phone,
        characterScale: scale, distances: DISTANCES, poseCount: 54 }, null, 2),
      contentType: 'application/json',
    });
  });
}
