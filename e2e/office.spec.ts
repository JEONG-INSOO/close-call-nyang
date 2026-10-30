import { test, expect } from './helpers';

test('office situations scroll through a fixed scene without adding nodes', async ({ cleanPage: page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Decorative scenes are captured once at the phone scene size.');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:4174/fixtures/');
  const scene = page.getByTestId('fixture-phone-scene');
  await expect(scene.getByTestId('scene-canvas')).toBeVisible();
  const nodes = await scene.locator('svg *').count();
  for (const distance of [51, 60, 100, 250]) {
    await page.getByTestId(`fixture-distance-${distance}`).click();
    await expect(page.getByTestId('fixture-scene-label')).toContainText(`합성 ${distance}`);
    for (const kind of ['typing', 'copier', 'presentation', 'break', 'documents', 'conversation']) {
      await expect(scene.getByTestId(`office-situation-${kind}`)).toHaveCount(2);
    }
    await expect.poll(() => scene.getByTestId('office-tiles').evaluate(el =>
      (el as unknown as SVGGraphicsElement).transform.baseVal.consolidate()?.matrix.e)).toBeCloseTo(-((distance - 51) * 86.4 % 2400), 3);
    expect(await scene.locator('svg *').count()).toBe(nodes);
    await scene.screenshot({ path: info.outputPath(`office-${distance}.png`) });
  }
});
