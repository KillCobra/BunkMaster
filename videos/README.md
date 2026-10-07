# Bunk Master trailer (Remotion)

30 s launch/showreel film. Everything is built from the game's own material:
- `public/plates/`: frames filmed in the game (`--nohud --cam=... --shot=...`, see ../README.md "Develop").
- `src/film/voxels.json`: the icon/splash diorama from `art/make_art.py`, rebuilt block by block.
- `src/film/icons.json`: item and badge SVGs from `scripts/icons.gd`.
- `src/film/ui.tsx`: frame-driven twins of the HUD (cards, phone, minimap, buttons), same colours and copy.
- `audio/make_music.py`: the original score, synthesized from scratch (128 BPM, 16 bars = 30.0 s);
  `src/film/cues.ts` uses the same bar grid, so every cut lands on a hit.

```bash
npm install
npm run music                                   # public/audio/trailer.wav (needs uv)
npx remotion studio src/index.ts                # preview
npx tsx scripts/stills.ts out/review 450 900    # stills at 60 fps frames
./scripts/render.sh v1                          # out/trailer/v1/BunkMaster-trailer.mp4 (240 fps -> motion blur)
```

## Reel Studio (dashboard)

Web editor for short ads: live preview, timeline, overlays, an original-music synth, Claude storyboards, MP4 render.

```bash
npm run dashboard        # http://localhost:5174
```

- **Claude**: "Subscription" runs your logged-in Claude Code (`claude -p`), no key needed; "API key" uses `ANTHROPIC_API_KEY`
  (`cp dashboard/.env.example dashboard/.env`). Pick the model in the panel. Up to 6 different takes on one brief are made in
  parallel, each optionally with its own music. Everything is kept: `reels/` (reels), `library/` (generation history, saved scenes, saved tracks).
- **Timeline**: scene lengths are in beats of the reel's BPM. Drag to reorder, drag an edge to resize, overlay track for stickers/captions.
- **Music** (tab): trailer score, or a custom pattern synth (`src/reel/synth.ts`): drum machine, bass and lead piano rolls, chords,
  build/drop/riser, presets, Claude composing. The browser previews and the server renders the same samples.
- Scene kinds live in `src/reel/Reel.tsx`, their fields in `src/reel/spec.ts` (add a kind in both, plus `KINDS`).
- Renders land in `out/reels/` (git-ignored): 9:16, 1:1, 16:9 at 30 fps. Shortcuts: space play, arrows scenes, Delete, Cmd+Z.

## Vertical cut and the meme

Both reuse the trailer's pieces (`src/film`) and the game's 3D voxel kit (`src/launch`).

```bash
./scripts/renderv.sh v1      # out/trailerv/v1/BunkMaster-reel-vertical.mp4: the 30 s trailer re-staged 1080x1920 (src/filmv)
COMP=TrailerV npx tsx scripts/stillsv.ts out/v/x 450 900     # stills of any composition (COMP=Meme for the meme)
uv run --with numpy --with scipy python audio/make_meme.py   # public/audio/meme.wav (effects + music)
./scripts/render-meme.sh v1  # out/meme/v1/BunkMaster-meme.mp4: the 18.75 s "silent escape" meme (src/meme)
```

- `src/filmv`: every act re-laid-out for 9:16 (same score and beat grid as the trailer). The lobby only offers two maps,
  so only First Day and Grand Campus are shown. The end card has WINDOWS / MAC / ONLINE chips and a COMING SOON stamp
  (`ComingSoon` in `src/film/acts/Finale.tsx`, also on the landscape trailer).
- `src/meme`: in-game 3D meme (classroom, escape, detention) built from the game's voxel sets, HUD pieces and real strings
  (the excuse picker, "It was Kenji! They made me do it!", the detention banner, the MOST BETRAYED award).
  `src/meme/cues.json` is the single clock for picture and sound: every cut sits on the 128 BPM grid.
- Meme music is the trailer's own tune re-arranged (`audio/meme_score.py`, instruments exec'd from `audio/make_music.py`);
  effects are in `audio/make_meme.py`. Change a cut time in `cues.json` and re-run `make_meme.py`.
