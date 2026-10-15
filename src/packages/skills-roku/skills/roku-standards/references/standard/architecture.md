# Architecture

## Layers, with purity rules

Structure the app as three conceptual layers. Whether they live in one
repo or three, the dependency direction and the purity rule are what
matter:

1. **Application layer** — the domain-specific UI and business logic
   (screens, features, brand), plus third-party integrations.
2. **Component layer** — generic renderable components: modals, grids,
   keyboards, the video player. **No domain-specific details allowed.**
3. **Foundation layer** — utilities, facades over the Roku SDK, services.
   **No domain-specific details allowed.**

The purity rule is the important part: lower layers never know brand or
business specifics. A generic `Modal` component that mentions your
product's name has leaked; a foundation `http` helper that knows one API's
auth scheme has leaked. Leaks are what make components non-reusable and
tests impossible.

## Multiple source roots, each with its own rules

Split the repo into source roots by *ownership and shipping rules*, not
just by topic:

| Root | Contents | Rules |
| --- | --- | --- |
| `src/` | The app: routes, features, gateways, actions, core framework | Full lint + diagnostics; brand-agnostic wherever possible |
| `src-brand/<brand>/` | Theme, fonts, brand images, brand config, the root scene | Everything a second brand would replace lives here — and nothing else does |
| `src-debug/` | Debug overlay/panels, framerate meters, test-automation hooks | Lint-ignored; gated behind `#if DEBUG`; shipped only by debug builds |
| `src-vendor/` | Third-party SDK code (analytics, ads, DRM) | Quarantined: lint ignored, compiler diagnostics downgraded per-path; **never edited** — vendor upgrades are file drops, not merges |

The separation means each root can have a different quality bar, different
build inclusion, and different ownership — without special-case files
polluting the app tree. Even if you never add a second brand, the split
keeps "what is ours and load-bearing" unambiguous.

## Feature-first taxonomy inside `src/`

```text
src/
  app.bs          ← entry point (main event loop, global setup, deeplinks)
  actions/        ← command components: Fetch, Navigate, Play, api/Get*
  core/           ← the framework (see framework-patterns.md)
    common/       ←   expressions (stdlib), async modules, constants, events
    components/   ←   Base.* SDK wrappers, router, reusable UI elements
    models/       ←   content models, HTTP shapes, theme, config schemas
  features/       ← cross-cutting capabilities: analytics/, user/, video/,
                    watchlist/, history/, navigation/
  gateways/       ← external-system access, worker-threaded, one per API
  modals/         ← exit, update, error dialogs
  routes/         ← one folder per screen: Home/, Details/, Search/,
                    Settings/, Debug/, Sandbox/
```

This is "screaming architecture": `ls` tells you the app's screens, its
external dependencies, and its features. Compare the default Roku layout
(`source/`, `components/`), which screams only "Roku".

## The build remaps human layout → Roku layout

Roku requires scripts in `source/` and SceneGraph components in
`components/`. Don't live in that shape — map into it at build time. With
BrighterScript, the `files` array is a routing table:

```jsonc
// bsconfig.json (files section)
"files": [
  "manifest",

  // 1. all scripts default to source/
  { "src": "**/*.(bs|brs)", "dest": "source" },

  // 2. anything in a plural "component-kind" folder ships as a component
  "!**/(component|task|model|action|route|modal|gateway)s/**",
  { "src": "**/(component|task|model|action|route|modal|gateway)s/**",
    "dest": "components" },

  // 3. entry point rename
  { "src": "./app.bs", "dest": "source/main.bs" },

  // 4. other roots map into namespaced package folders
  { "src": "../src-vendor/**/*.(xml|bs|brs)", "dest": "components/vendor" },
  { "src": "../src-brand/acme/**/*.(bs|brs)", "dest": "source/brand" },
  { "src": "../src-debug/**/*.(bs|brs)",      "dest": "source/debug" },

  // 5. docs are free — strip them from the package
  "!**/*.(md)"
]
```

Two consequences worth internalizing:

- **The plural folder-name suffix is a build instruction.** Name a folder
  `actions/` and its contents become SceneGraph components. Convention
  *is* configuration — placement mistakes are structural, not cosmetic.
- **Markdown never ships**, so READMEs can (and should) live next to the
  code they document.

## Composition roles, from root to leaf

- **Entry** (`app.bs`): create the `roSGScreen`, populate the global node
  *once* with static context, run a single event loop for app-level
  events:

  ```brightscript
  ' @param {object} [args]
  '
  sub Main(args = {})
      m.port = CreateObject("roMessagePort")
      m.screen = CreateObject("roSGScreen")
      m.screen.setMessagePort(m.port)

      m.global = m.screen.getGlobalNode()
      m.global.addFields({          ' static context, written once
          env: chooseEnv(args)
          appInfo: getAppInfo()
          deviceInfo: getDeviceSnapshot()
          deeplink: parseDeeplink(args)
      })

      m.scene = m.screen.createScene("Brand.Scene")
      m.screen.show()
      while true                     ' exit / relaunch / voice deeplinks only
          event = wait(0, m.port)
          if handleAppEvent(event) = "exit" then return
      end while
  end sub
  ```

- **Scene**: owned by the brand root (`Brand.Scene`), injecting theme and
  config into the generic app shell.
- **Router**: one component owning the history stack, menu focus handoff,
  and back-key semantics — screens never implement "back" themselves.
- **Routes**: each screen is a thin XML layout + a script behavior file,
  extending `Base.Screen` (see below).
- **Gateways/actions**: all I/O on background threads, promise-based
  results (see [framework-patterns.md](./framework-patterns.md)).

## `Base.*` — an anti-corruption layer over the Roku SDK

Wrap every Roku built-in you use in a project-owned component, even when
the wrapper starts empty:

```xml
<!-- Base.Screen.xml -->
<component name="Base.Screen" extends="Group">
  <script type="text/brightscript" uri="Base.Screen.brs" />
</component>

<!-- Base.Video.xml, Base.Task.xml, Base.Keyboard.xml ... same idea -->
```

App code extends `Base.Screen`, `Base.Video`, `Base.Task` — never `Group`,
`Video`, `Task` directly. That single choke point is where lifecycle
hooks, focus handling, and platform workarounds get installed *once*,
instead of being re-fixed in every component. The day a firmware update
breaks poster caching or focus timing, you have one file to patch, not
forty.
