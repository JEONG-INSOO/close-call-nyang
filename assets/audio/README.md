# Original Nyang office audio

These five PCM WAV assets are synthesized from the original score and timbre data
in `scripts/generate-audio.mjs` (revision 1). No recordings, downloaded samples,
third-party tune, voice, or generative audio service is used. They are project-owned
source assets; use and modification within this game are permitted. No separate
third-party audio attribution or audio license is required.

Regenerate with `npm.cmd run assets:audio`. The generator checks PCM headers, exact
sample count, non-silence, no clipping, persisted bytes and the loop seam, and prints
SHA-256 hashes so repeated generation can be compared. Every asset is 44.1 kHz,
16-bit, mono. The commute loop is 12 seconds: five four-beat bars at 100 BPM.
Its wrapped note tails preserve continuity across the seam. Effects are 0.10–0.58s.

Music playback targets volume 0.15; effects target at most 0.4. Actual loudness and
headphone interruption behavior still require listening/device QA. iOS web browser
volume restrictions may require adjustment with physical device volume controls.
There is deliberately no score-100 sound. These files contain no runtime network,
analytics, ad, microphone or recording behavior.

Implementation references: [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/)
and [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/), checked against
the locally installed SDK 57 source. Native players use Expo lifetime-managed hooks;
the web adapter catches the HTML media play promise directly because the installed
Expo web `play()` method discards that promise.
