# Firefly Choreographer

**Live at [fireflyparade.vickychappuis.dev](https://fireflyparade.vickychappuis.dev)**

A browser toy: paint a 16×6 time grid and a looping nighttime meadow answers back with
fireflies. Columns are time, rows are flight height (warm amber near the grass, cool
moon-white up high). When the moonbeam sweep crosses a painted cell, that cell's firefly
flashes and chimes — rows map to a pentatonic scale on a small original Web Audio synth
(triangle + octave shimmer, soft lowpass, long decay), so any pattern sounds consonant.

Born from a black-box study of Chrome Music Lab's Song Maker — see
[`docs/research/song-maker.md`](docs/research/song-maker.md) for the interaction
principles it borrows (paint/erase drags, gesture-scoped undo, everything live during
playback) and the ones it deliberately avoids.

## Run

```sh
npm install
npm run dev       # local dev server
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
```

Deployed on Vercel (project `firefly-parade`); `vercel deploy --prod` ships a new build.

## Controls

- **Click** a cell to toggle it (with a quiet note preview); **drag** to paint a run.
  Starting a drag on a lit cell erases everything the drag touches.
- **▶ / ■** or **Space** — start/stop the loop. Editing and tempo changes apply live,
  to the lights and the sound alike.
- **♪** — mute/unmute. The choreography keeps playing silently.
- **Tempo** — 40–240 BPM, linear and labeled.
- **Undo** — reverts the last whole gesture (a drag, a clear).
- **Clear** — wipes the grid, no confirmation needed: one Undo brings it all back.

No accounts, no saving — the loop is the product. Vanilla TypeScript + Vite, two
canvases (static night, additive glow layer) under a DOM cell grid, Web Audio for sound.
