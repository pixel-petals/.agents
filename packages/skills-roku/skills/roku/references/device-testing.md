# Testing on a Real Roku

The `roku-dev-studio` MCP drives a real device through the Roku Dev Studio desktop app. Behaviour that matters — rendering, playback, timing, sound — gets verified there, not assumed from docs.

## Setup

- **`probe_bridge` first;** if it is not live, Dev Studio needs opening.
- **`list_devices`, then pass `device` (IP or serial) on every call.** Several Rokus may be listed, and people share them: a sideload replaces whatever channel is running. Use the device the user names.
- **`telnet_connect` before `get_telnet_log`:** console lines only accumulate while attached. Poll with `afterCursor` to read only new lines.

## Packaging

- **The manifest must sit at the zip's root,** with forward-slash entry names. PowerShell's `Compress-Archive` writes backslashes, and the device then reports `Script directory "/source" does not exist`. Zip with Python's `zipfile`, or `zip` from bash.
- **Zip bsc's actual output folder.** With a `stagingDir` in bsconfig the files land there, and zipping its parent gives `No manifest. Invalid package.`
- **Compile with bsc before every sideload.** It catches what the device would only report at runtime.

## Reading results

- **Logs are the record; screenshots are a spot check.** A `screenshot` often lands seconds late or early, or shows the home screen while the channel is still starting. `waitAfterTriggerMs` helps but is not exact. Read state from `print` lines.
- **Print every state change with a timestamp:** `print "[probe] +"; clock.totalMilliseconds(); "ms "; node.state`. Mirror the latest line in an on-screen Label, red for errors, so a screenshot shows it too.
- **Look for runtime errors in the console:** `BRIGHTSCRIPT: ERROR: …` lines name the transpiled file and line (`gif.brs(103)`). Read the transpiled `.brs` there, not the `.bs`.
- **Sample animation over time.** One frame of a looping clip proves nothing about timing, and clustered screenshots produced false bugs.

## Probes

Answer a question about the platform with a minimal channel, not the product:

- **Script it in time:** a list of `{ at: ms, … }` steps run by a 50–100 ms Timer, so pauses, swaps and inputs happen at known moments.
- **One question per case,** several cases per page or run, each labelled on screen.
- **Name functions defensively.** A sub named `run` silently called the built-in `Run()` and the probe did nothing, with no diagnostic.

## Sound

The MCP cannot hear. Node states say what the device attempted, not what was audible:

- **Ask the user to listen,** and put a large caption on screen naming what should be heard at each moment ("3. BELLS — Audio node alone").
- **Audio stuck in `buffering` with no error usually means no audio output:** the TV is off or on another input. Ask before debugging code.
- **SoundEffect reports `playing` even when muted.**
