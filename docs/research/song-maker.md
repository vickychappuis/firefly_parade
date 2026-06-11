# Song Maker — product research notes

Black-box investigation of https://musiclab.chromeexperiments.com/Song-Maker/ via
Playwright-driven browser interaction only (no source/network/asset inspection).
Sessions: 2026-06-11. Screenshots in `.research/song-maker/` (untracked).

## Confirmed behavior

**Layout.** Melody grid (rows = pitches, columns = time) above a 2-row percussion strip;
one bottom toolbar: Play/Stop, melodic + percussion instrument buttons, tempo slider with
BPM textbox, Mic, Settings, Undo, Save. No text labels anywhere in the grid — pitch is
vertical position + per-row color, melody notes are squares, percussion is triangles
(row 1) and circles (row 2), bars are alternating white/gray bands, beats are blue lines.

**Editing.**
- Click toggles a cell on/off. Multiple notes per column work (chords).
- Drag paints every cell traversed. Starting a drag on an *occupied* cell flips the whole
  gesture to erase mode — it removes every note it sweeps over.
- Undo is gesture-scoped: one press reverts an entire drag, not one cell.
- Restart clears the song with no confirmation, but a single Undo restores everything —
  including the tempo it reset. Restart is just another undoable action.

**Playback.**
- Loops continuously; light-blue full-height column is the playhead; Play ↔ Stop morph.
- Fully live: adding/removing notes and dragging the tempo slider (120 → 61 BPM observed)
  take effect mid-loop without stopping or glitching playback.

**Structure (Settings overlay).** Length (bars) × beats per bar × beat subdivision define
the column count (default 4×4×2 = 32). Scale (Major/Pentatonic/Chromatic), root note,
starting octave, range (octaves) define the rows. Changing scale *remaps* existing notes
non-destructively instead of deleting them.

**Instruments.** Buttons cycle in place on click: Marimba → Piano → Strings → Woodwind →
Synth; Electronic → Blocks → Kit → Conga.

**Sharing.** Save is disabled until the grid has content; one click mints an anonymous
permalink (`/Song-Maker/song/<id>`, no account) with Copy Link / MIDI / WAV / Embed.

**Accessibility.** Grid is an ARIA application (arrow keys move a cursor, Enter/Backspace
add/remove, Space plays); a GamePad button shows an equivalent on-screen D-pad.

## Open questions

- Undo depth and whether redo exists (only single-step undo verified).
- Does the saved permalink restore full state (tempo, instruments, settings) on reload?
- Mic input flow (sing → notes) — untested, needs mic permission.
- Audio feedback on note placement (couldn't hear in the driven browser).
- Tempo slider range and mapping (readout suggests ~40–240 BPM; nonlinear?).
- What happens to out-of-range notes when *shrinking* length/range in Settings.
- Keyboard editing needs Song Area focus; how focus is acquired wasn't established
  (stray Enter presses activate whatever toolbar control has focus instead).

## Interaction patterns worth borrowing

- **Start-cell decides paint vs erase** for a drag — one gesture, two modes, zero UI.
- **Gesture-scoped undo** — undo units match user intent, not data mutations.
- **Everything live during playback** — editing and tempo never stop the loop; the app
  always feels playable, never modal.
- **Destructive actions made safe by undo instead of confirmation dialogs** (Restart).
- **Color/shape/position instead of text** — zero-literacy UI; melody vs percussion get
  distinct visual grammars.
- **Non-destructive remapping** when the musical "paper" (scale/range) changes.
- **Save = share**: one click to a permanent anonymous URL plus MIDI/WAV export.

## What not to copy

- **Cycle-through instrument buttons**: the only way to see the options is to click
  through all of them, mutating state as you browse. A small picker would be better.
- **No confirmation AND quiet undo on Restart**: safe only because undo restores it, but
  nothing tells the user that; with unknown undo depth this is easy to lose work to.
- **Save publishes silently**: clicking Save uploads the song to a public URL with no
  prior indication that's what "save" means.
- **Focus pitfalls in the keyboard model**: arrow/Enter input goes to whatever control
  has focus; without a visible focus cue, keyboard edits land on toolbar buttons.
- **Tempo slider position ↔ BPM mapping is opaque** (slider value and BPM readout
  diverge); pick one scale and label it.
