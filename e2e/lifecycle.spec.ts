import { test, expect, openGame, startGame, loseWithRight } from './helpers';

interface RoundObservation {
  round: number;
  collectedAt: string;
  visibleResultScore: string;
  windowListeners: Record<string, number>;
  performanceMetrics: Record<string, number>;
}

test('five genuine short rounds keep window listener counts stable', async ({ cleanPage: page, context }, info) => {
  test.setTimeout(90000);
  test.skip(info.project.name !== 'desktop', 'This CDP lifecycle observation runs once in the desktop project.');
  await openGame(page);
  const cdp = await context.newCDPSession(page);
  const rounds: RoundObservation[] = [];

  try {
    await cdp.send('Performance.enable');
    // Five actual start/fall/retry rounds, not long survival or an FPS benchmark.
    // Scores, random seeds, engine state and controller actions are never injected.
    for (let index = 0; index < 5; index += 1) {
      await startGame(page, index > 0);
      await loseWithRight(page);
      const evaluation = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const listeners = getEventListeners(window);
          return Object.fromEntries(Object.keys(listeners).sort()
            .map(type => [type, listeners[type].length]));
        })()`,
        includeCommandLineAPI: true,
        returnByValue: true,
      });
      expect(evaluation.exceptionDetails, 'CDP listener inspection must not throw or silently fall back').toBeUndefined();
      expect(evaluation.result.type).toBe('object');
      const windowListeners = evaluation.result.value as Record<string, number>;
      expect(windowListeners).toBeTruthy();
      expect(Array.isArray(windowListeners)).toBe(false);
      for (const count of Object.values(windowListeners)) {
        expect(Number.isSafeInteger(count)).toBe(true);
        expect(count).toBeGreaterThanOrEqual(0);
      }

      const collected = await cdp.send('Performance.getMetrics');
      const performanceMetrics = Object.fromEntries(collected.metrics.map(metric => [metric.name, metric.value]));
      for (const metric of ['JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes', 'JSEventListeners', 'TaskDuration']) {
        expect(Number.isFinite(performanceMetrics[metric]), `Required CDP metric ${metric} is available`).toBe(true);
      }
      rounds.push({
        round: index + 1,
        collectedAt: new Date().toISOString(),
        visibleResultScore: await page.getByTestId('result-score').innerText(),
        windowListeners,
        performanceMetrics,
      });
    }

    expect(rounds).toHaveLength(5);
    expect(rounds[4].windowListeners, 'Window listeners per event must match the first completed round').toEqual(rounds[0].windowListeners);
    // Heap, DOM-node and aggregate JS-listener values are observations only.
    // GC timing and cumulative task duration do not establish leaks or device FPS.
  } finally {
    await info.attach('five-short-round-lifecycle-metrics', {
      body: JSON.stringify({
        scope: 'Five real UI-driven short rounds; not long-survival or FPS evidence. Heap/DOM/aggregate metrics are observations without forced GC.',
        project: info.project.name,
        viewport: page.viewportSize(),
        browserVersion: context.browser()?.version() ?? null,
        rounds,
      }, null, 2),
      contentType: 'application/json',
    });
    await cdp.detach();
  }
});
