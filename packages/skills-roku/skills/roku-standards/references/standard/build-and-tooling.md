# Build & Tooling

## One base config, per-environment targets

Keep all shared build configuration — the `files` routing table, plugins,
diagnostics — in one base `bsconfig.json`. Each deploy target is a small
override file extending it:

```jsonc
// bsconfig.prod.json
{
  "extends": "bsconfig.json",
  "stagingDir": "out/prod",
  "manifest": { "bs_const": { "DEBUG": false, "STAGING": false } }
}
```

Typical target set: `prod`, `prod-debug` (production data + debug
tooling), `staging`, `preprod`, `cert` (Roku certification build). Wire
them as npm scripts, each with a clean output dir:

```jsonc
"scripts": {
  "build": "npm run build:prod && npm run build:staging && npm run build:cert",
  "build:prod":    "rimraf ./out/prod    && bsc --project bsconfig.prod.json",
  "build:staging": "rimraf ./out/staging && bsc --project bsconfig.staging.json",
  "build:cert":    "rimraf ./out/cert    && bsc --project bsconfig.cert.json"
}
```

Switching environment is a build selection, never a code edit.

## Compile-time flags, not runtime checks

`bs_const` flags in the manifest (`DEBUG`, `DEBUG_VIDEO`, `DEBUG_PROXY`…)
exclude debug code from production *bytecode* entirely:

```brightscript
#if DEBUG
    if getAppInfo().isDev()
        m.testAutomationNode = CreateObject("roSGNode", "TestAutomationHost")
    end if
#end if
```

Two gates: compiled in only for debug builds, activated only in developer
mode. Because debug tooling costs production nothing, it can afford to be
rich (see below).

## Compiler and manifest as code

- **BrighterScript (`bsc`)**, not raw BrightScript — imports, namespaces,
  enums, template strings, and compile-time diagnostics, with v1's type
  checker reading JSDoc types. It consumes existing `.brs` untouched, so
  adoption is incremental. Namespaces group functions; classes are for
  value objects only.
- **`compilerOptions.minFirmwareVersion` of at least `"11.0.0"`**, which
  makes optional chaining (`?.`, native from Roku OS 11) safe to use; bsc
  flags syntax newer than the floor.
- **Sourcemaps on**, so on-device stack traces map back to real source
  files.
- **Generate the manifest per-target** (via a bsc plugin or a build
  script) from one description + the target's overrides — no hand-edited
  manifest drift between environments.
- **Versioning** through `npm version patch|minor|major`; package.json is
  the single version source, propagated into the manifest at build time.

## Lint philosophy: catch crashes, skip bikeshedding

Configure the linter for signal:

```jsonc
// bslint.json
{
  "ignores": ["**/src-vendor/**", "**/src-debug/**"],
  "rules": {
    // real Roku crashes — errors
    "unsafe-path-loop": "error",
    "unsafe-iterators": "error",

    // likely bugs — warnings
    "case-sensitivity": "warn",
    "unused-variable": "warn",
    "no-stop": "warn",

    // pure style — off; the codebase's conventions live in review,
    // not in a linter that cries wolf
    "inline-if-style": "off",
    "condition-style": "off",

    // governs `as` annotations only; types live in JSDoc instead,
    // since a mismatched `as` crashes Roku rather than converting
    "type-annotations": "off"
  }
}
```

Apply the same idea to compiler diagnostics: downgrade noisy diagnostics
*per-path* for vendor code (`cannot-find-name` → info under
`src-vendor/**`) rather than disabling them globally. Signal stays high
where the code is yours.

## Vendor quarantine

Third-party SDK code (analytics, ads, DRM) lives in its own root
(`src-vendor/`), is **never edited** to satisfy tooling, ships to
`components/vendor/`, and is reached only through adapter components (see
[framework-patterns.md](./framework-patterns.md)). Vendor upgrades are
file drops, not merges — and no one wastes a day "fixing" lint in code
that the next SDK release overwrites.

## Debug tooling is a feature

Budget real engineering for a dev-only toolkit in `src-debug/`, all
stripped from prod by `bs_const`:

- **On-device overlay/panels**: current screen, focus chain, content ids,
  environment; toggled by a remote key combo in debug builds.
- **Framerate meter and node-count tracker** — SceneGraph performance
  regressions are invisible until measured.
- **Test-automation host** (e.g. the community Roku Test Automation /
  on-device-component pattern) enabling scripted device control from the
  IDE.
- **A Sandbox route**: an empty screen registered only in debug builds,
  for trying components in isolation — Roku's answer to Storybook.
- **HTTP proxy support** behind a `DEBUG_PROXY` flag (device traffic
  through Charles/Proxyman/mitmproxy), because you cannot breakpoint a
  Task thread's network stack.

The lesson: on a closed platform with weak native debugging, your own
observability tooling pays for itself within weeks — and the multi-root +
compile-flag structure makes it free in production.

## Repo ergonomics

- **Check in the IDE config**: `.vscode/launch.json` (deploy/debug to a
  device), `settings.json`, and `extensions.json` recommending the
  BrighterScript language server. A new dev clones, sets
  `ROKU_DEV_TARGET`, and presses F5.
- **Scripts for the boring parts**: doc-link maintenance, asset
  processing, package signing — anything done twice by hand.
- **A code graph or component index** if the project grows large: agents
  and humans both benefit from a queryable "what extends/calls what"
  beyond text search, because Roku references components by string name.
