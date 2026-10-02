# Media on Roku

Device-tested behaviour of the nodes that play animation and sound. The full write-ups, with every test case, are in the `roku.rive-adapter` repo: `src/docs/ROKU-LOTTIE.md` and `src/docs/ROKU-AUDIO.md`.

- **Test devices:** Roku Ultra 4850CA on OS 16.0.4 and on OS 15.3.4, 1080p.
- **Unverified:** other models and OS versions, unless stated.

## AnimatedImage

**`AnimatedImage` arrived with Lottie support.** The node existing is the whole capability test; there are no devices with the node but without Lottie. `createObject("roSGNode", "AnimatedImage")` returns `invalid` where it is missing, so create it in code rather than in XML `<children>`.

### Formats

| `mimeType` | Plays |
| --- | --- |
| `video/lottie+json` | ✅ Lottie JSON and zipped dotLottie (v1 and v2) |
| `video/webp` | ✅ animated WebP, alpha included. ⛔ A single-frame WebP fails: `Insufficient data` |
| `video/mp4` | ✅ VP9 only, no alpha. ⛔ H.264 and AV1: `No codec found` |
| any | ⛔ WebM, under every mime type |
| unset | ✅ sniffs Lottie, dotLottie, animated WebP and MP4 |
| — | ⛔ **No audio** from any format |

### Fields

- **`width`/`height` at 0** draw at the file's own size, not at nothing.
- **The Lottie is rasterised once,** at its own size or at `loadWidth`×`loadHeight`, then bitmap-scaled. Upscaled vectors come out soft, so author at the largest display size.
- **`loadDisplayMode`:** `scaleToFit` letterboxes; `scaleToFill` and `noScale` both stretch; `limitSize` fits without upscaling; **`scaleToZoom` draws nothing.**
- **Sources:** `pkg:/`, `tmp:/`, `https://` (any content type) and `http://` (redirects followed) all work.

### Control and state

| Action | Result |
| --- | --- |
| `control: "loop"` | Repeats; `state` stays `decode` |
| `control: "play"` | One pass, then `state: "stop"`, holding the last frame |
| `control: "pause"` | Freezes, **also `state: "stop"`**; `play` resumes from that frame |
| `control: "rewind"` | Frame 0, stopped, `state: "first"` — never resumes by itself |
| `play` after a pass ended | **Nothing.** Send `rewind`, then `play` |
| No `control` ever set | Loads to `first`, showing frame 0 |
| `control` set before `uri` | Kept; plays once loaded |
| Undocumented value (`"stop"`) | Ignored |

- **`state` while playing is `decode`,** not the documented `playing`. Load sequence: `downloading` → `init` → `first` → `decode`.
- **`stop` means ended or paused:** tell them apart by the last command sent.
- **There is no seek, segment, speed or direction.** A marker-based Lottie plays every state back to back, so ship one file per state.

### Swapping uri

- **The node clears on every swap:** it drops to `downloading` at 0×0, and reaches `decode` 4–30 ms later from `pkg:/` (about 70 ms for a file's first load). Screenshots caught the cell blank, sometimes after `decode` was already reported.
- **Fix:** stack two nodes and swap the hidden one, showing it once it reports `decode` (`first` under no play command). Verified in Motion on OS 16: state changes and live patches swap with no blank frame.
- **A patch to a finished clip** can keep its last frame on screen: play the new file in the hidden node and swap at its own `stop`.
- **Setting the same uri is ignored.** **`mimeType` then `uri`** switches format live.
- **A uri shown before brings back its old frames,** even after the file is deleted and rewritten: the node keeps its decode per uri. Give every generated file a new name; alternating two names shows stale data from the third write on.

### Lottie features that fail

Every Lottie file reaches `decode` with no `error`, even one that draws nothing, so check files before they ship.

- **`ty` must come before an object's other keys.** A Lottie written back with `FormatJSON`, which sorts keys, draws nothing, with no error. The same file with `ty` moved first draws, though every other key stays sorted. Edit Lottie JSON as text, or serialise it with `ty` first.

| Feature | Device behaviour | Preprocess fix |
| --- | --- | --- |
| Any partial alpha | Colour multiplied by α twice: `colour·α² + bg·(1−α)` | Over a known solid background, blend into an opaque colour; otherwise pre-render to animated WebP, which composites correctly. Mattes darken the same way, so they are no workaround |
| Text layers (`ty: 5`) | Draw nothing, with every font source tried, including Roku system fonts | Convert glyphs to shapes |
| Matte by `tp` reference | Matte draws, target vanishes | Put the `td` layer directly above its target; drop `tp` |
| Mask `mode: "n"` | Whole layer vanishes | Delete the mask |
| Image asset at `pkg:/` | Draws nothing | Path relative to the JSON, or a data URI |
| JPEG, GIF, SVG image assets | Draw nothing | PNG or WebP; SVG to shapes |
| Merge paths, round corners, deformers, skew, expressions, blend modes, effects, slots | Ignored | Bake into geometry where possible |
| dotLottie themes, state machines, animation choice | Ignored: the first animation plays | One animation per file |

## Audio and SoundEffect

| | `Audio` | `SoundEffect` |
| --- | --- | --- |
| Formats | MP3, WAV, AAC (M4A), Vorbis (MKA) | WAV only (MP3: `loadStatus: failed`) |
| At once | **One per channel** | Several; mixes over everything |
| Start latency | 110–430 ms after `play` | 0–30 ms |
| Pause / resume | Yes, in place | No: only `play` and `stop`, no `loop` |
| Heard when UI sounds are off | Yes | **No** |
| `pkg:/` and `tmp:/` | Both | Both |

- **Important sound belongs on the Audio node;** keep SoundEffect for extras that may go unheard. SoundEffect plays at the user's UI sound volume and is silent when that is off, while still reporting `playing` and `finished`.
- **`GetSoundEffectsVolume()` is not a reliable check:** it returned 0 on a device whose effects were audible. Play effects regardless.
- **A second Audio node fails while one plays:** `state: "error"`, `errorMsg: "player: only one playing instance supported."`. The first keeps playing. Share one Audio node across the channel, tagged with its owner, so nobody stops another's sound.
- **Audio setup:** a ContentNode with `url` is enough; `streamFormat` and `contentType: "audio"` change nothing. `control: "start"` is rejected as invalid.
- **No audio output (TV off) leaves Audio in `buffering` forever,** with no error; it starts by itself once there is an output. SoundEffect keeps reporting normally meanwhile.
- **WebM's Opus never plays,** under any `streamFormat`. Decode it offline to WAV (`@audio/decode-webm` / `@audio/decode`).
- **Setting a SoundEffect's `uri` loads the whole WAV on the render thread:** a 2.8 MB file blocked it for about 300 ms. Set the uri ahead of the cue, and keep files small: 22 kHz mono is a quarter of 44.1 kHz stereo.

## Effect (OS 16)

`Effect` applies shader effects to `Poster` and `Rectangle` through their `effect` field: corner radii, borders, and linear or radial gradients of 2–8 colours. Its read-only `supported` field is false where the GPU cannot shade, and the effect is then skipped. `AnimatedImage` has no `effect` field. Not device-tested here.
