# Android 15/16 Edge-to-Edge Compatibility

## Scope
Fix only Android system-bar and edge-to-edge compatibility. Preserve all existing SHA-VERSE modules, backend behavior, authentication, notifications, ads, plugins, and visual design.

## Changes
1. Remove the app-owned runtime status-bar background-color call that invokes Android's deprecated `Window.setStatusBarColor` through the Capacitor StatusBar plugin.
2. Keep the StatusBar plugin only for icon appearance, and synchronize light/dark icon style with SHA-VERSE's active theme without adding opaque system-bar backgrounds.
3. Enable Capacitor 7's supported Android edge-to-edge inset adjustment so its WebView accounts for status bars, navigation bars, and display cutouts on Android 15/16.
4. Preserve `adjustResize` for keyboard/IME behavior and retain the existing web safe-area CSS as a fallback for overlays and non-Android platforms.
5. Do not add the temporary Android 15 opt-out flag and do not patch `node_modules`.

## Verification
- Search app-owned Android/TypeScript/XML sources again for every deprecated system-bar API named in the request.
- Confirm any remaining calls are only inside installed Capacitor plugin sources.
- Run the web build/type checks and Android Gradle lint/assemble checks available in the sandbox.
- Report exact changed files, reasons, remaining third-party warnings, and the local sync/build/test commands.

## Technical Notes
- Capacitor 7.4.4 provides `android.adjustMarginsForEdgeToEdge`; using its supported mode avoids custom native inset code and duplicate safe-area handling.
- Android 15 enforces edge-to-edge for target SDK 35+, and Android 16 removes the opt-out path for target SDK 36. The production fix therefore adopts edge-to-edge rather than suppressing it.
