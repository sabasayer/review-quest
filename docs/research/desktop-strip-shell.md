# Which desktop shell can show a strip at the bottom of the screen?

Research for issue #4. Date: 2026-11-10.

A "shell" here is the desktop program that holds the game window.
The game is TypeScript + Canvas 2D. The shell must show it as a thin strip.
The strip stays at the bottom of the screen, on top of other windows.

## How to read this file

Each fact has a tag. The tag shows how strong the fact is.

- **[docs]**: the official docs of the tool or the system say it.
- **[tracker]**: the tool's own issue tracker says it. A maintainer confirmed it, or the issue is open.
- **[measured]**: I measured it on 2026-11-10. The text says how.
- **[community]**: a blog, a plugin or a forum says it. Trust it less.
- **[inference]**: my own conclusion. No source says it directly.

Nobody ran a test build for this research. The prototype must test the important points.

## Short answer

- Electron can do every strip behaviour on macOS and Windows with documented options.
- Tauri v2 can do most of it. It is much smaller.
- Tauri v2 needs extra native code for two points. See "Tauri v2" below.
- A native macOS panel (NSPanel) can do everything on macOS. It only runs on macOS.
- No shell can force a strip on GNOME with Wayland. Wayland is the newer Linux display system.
- No shell can reserve screen space on macOS. The system has no public interface for it.

Recommendation: build the prototype in Electron. Keep the game free of shell code.
Test Tauri v2 in a short trial before the team rollout. Reasons are at the end.

## Comparison table

| Question | Electron | Tauri v2 | Native macOS (NSPanel) |
| --- | --- | --- | --- |
| Always on top | Yes on macOS, Windows, X11. No on Wayland. [docs] | Yes on macOS, Windows, X11. No on Wayland. [docs] [tracker] | Yes. [docs] |
| Above full-screen apps (macOS) | Yes. Documented options. [docs] | Not with the documented options alone. [tracker] | Yes. [docs] [community] |
| On all desktops | macOS and Linux: yes. Windows: no. [docs] | macOS and Linux: yes. Windows: no. [docs] | Yes. [docs] |
| Thin, no frame, transparent | Yes. [docs] | Yes. [docs] | Yes. [docs] |
| Click-through | Yes. Mouse-move forwarding on macOS and Windows. [docs] | Yes, for the whole window only. [docs] | Yes, for the whole window. [docs] |
| Reserve screen space | No built-in option. [inference] | No built-in option. [inference] | Not possible on macOS. [inference] |
| Download size | 80 to 100 MB zipped. [docs] | Under 1 MB possible for a minimal app. [docs] | Very small. [inference] |
| Memory use | Higher. No official number. [community] | Lower in most tests. No official number. [community] | Lowest. [inference] |
| Runs TypeScript + Canvas 2D with no rewrite | Yes. One browser engine everywhere. [docs] | Yes. Three different engines. [docs] | Only inside a web view. macOS only. [inference] |
| Auto-update | macOS and Windows. Not Linux. [docs] | macOS, Windows and Linux (AppImage). [docs] | You build it yourself. [inference] |
| Platforms | macOS, Windows, Linux | macOS, Windows, Linux | macOS only |

## What each system allows

The shell can only do what the system allows. So these facts apply to every shell.

### macOS

- macOS stacks windows by level. A higher level always covers a lower level. [docs] [NSWindow.Level](https://developer.apple.com/documentation/appkit/nswindow/level-swift.struct)
- Level numbers on macOS 27.2: normal 0, floating 3, Dock 20, main menu 24, status bar 25, screen saver 1000. [measured] I printed the values with a small Swift script.
- So a "floating" window is below the Dock. A "status bar" window is above the Dock. [inference from the numbers]
- `canJoinAllSpaces` shows a window on all spaces (virtual desktops). [docs] [canJoinAllSpaces](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/canjoinallspaces)
- `fullScreenAuxiliary` shows a window on the space of a full-screen window. [docs] [fullScreenAuxiliary](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/fullscreenauxiliary)
- `canJoinAllApplications` is for "floating windows and system overlays". [docs] [canJoinAllApplications](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/canjoinallapplications)
- `nonactivatingPanel` makes a panel that does not activate its app. [docs] [nonactivatingPanel](https://developer.apple.com/documentation/appkit/nswindow/stylemask-swift.struct/nonactivatingpanel)
- `ignoresMouseEvents` makes a window "transparent to mouse events". [docs] [ignoresMouseEvents](https://developer.apple.com/documentation/appkit/nswindow/ignoresmouseevents)
- These flags alone are not enough above full-screen apps. An Apple support engineer said this on the Apple developer forum. [community]
  - The app must use the "accessory" activation policy. Then it has no Dock icon.
  - The window must be a non-activating NSPanel.
  - The level must be screen saver (1000). Floating and status bar are below full-screen content.
  - The engineer tested this on macOS 26. Source: [forum thread 826308](https://developer.apple.com/forums/thread/826308).
- `NSScreen.visibleFrame` is the safe area. It does not include the Dock and the menu bar. [docs] [visibleFrame](https://developer.apple.com/documentation/appkit/nsscreen/visibleframe)
- The value can change at any time. With a hidden Dock it can still be smaller than the screen. [docs] Same page.
- I found no public interface that reserves screen space on macOS. [inference] Other windows can always go under the strip.

### Windows

- `WS_EX_TOPMOST` keeps a window above all windows that are not topmost. [docs] [Extended Window Styles](https://learn.microsoft.com/en-us/windows/win32/winmsg/extended-window-styles)
- `WS_EX_NOACTIVATE` stops a window from taking focus on a click. [docs] Same page.
- `WS_EX_TOOLWINDOW` hides a window from the taskbar and from ALT+TAB. [docs] Same page.
- Windows can reserve screen space. The feature is the "appbar" (application desktop toolbar). [docs] [Application Desktop Toolbars](https://learn.microsoft.com/en-us/windows/win32/shell/application-desktop-toolbars)
  - The system stops other apps from using the area of an appbar.
  - An appbar must be at a screen edge. The taskbar always keeps the outer edge.
  - So an appbar at the bottom sits directly above the taskbar.
  - When a full-screen app starts, the appbar "must drop to the bottom" of the stack.
- The public virtual desktop interface has three methods. None shows a window on all desktops. [docs] [IVirtualDesktopManager](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nn-shobjidl_core-ivirtualdesktopmanager)

### Linux with X11

- Electron and Tauri both document always-on-top with no X11 limit. [docs]
- Electron has a `dock` window type for Linux. It gives "dock-like window behavior". [docs] [BaseWindow options](https://www.electronjs.org/docs/latest/api/structures/base-window-options)
- I did not check how X11 reserves screen space. [not verified]

### Linux with Wayland

- A normal Wayland window uses the `xdg-shell` protocol (a set of rules between app and system).
- `xdg-shell` has no request for position, for always-on-top or for reserved space. [docs] [xdg-shell](https://wayland.app/protocols/xdg-shell)
- An Electron maintainer confirmed: "there is no concept of always on top in the Wayland protocol". [tracker] [electron#50403](https://github.com/electron/electron/issues/50403)
- The `wlr-layer-shell` protocol is the way to make panels. [docs] [wlr-layer-shell](https://wayland.app/protocols/wlr-layer-shell-unstable-v1)
  - It has four layers: background, bottom, top, overlay.
  - `set_anchor` fixes a surface to a screen edge.
  - `set_exclusive_zone` asks the system to keep other windows out of the area.
- Not every Wayland desktop supports `wlr-layer-shell`. [docs] Same page, support table.
  - Supported: KWin (KDE Plasma), Sway, Hyprland, COSMIC, niri, Wayfire and more.
  - Not supported: Mutter (GNOME) and Weston. The table marks them with "x".
- GNOME is the default desktop of several large Linux distributions. [inference] So this gap is important.

## Electron

Electron packs the Chromium browser and Node.js into each app. [docs] [Why Electron](https://www.electronjs.org/docs/latest/why-electron)

### Always on top

- `setAlwaysOnTop(flag, level)` exists. Levels include `floating`, `status`, `pop-up-menu` and `screen-saver`. [docs] [BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)
- The level option works on macOS and Windows. [docs] Same page.
- Always-on-top is "not supported on Wayland (Linux)". [docs] Same page.
- `setVisibleOnAllWorkspaces(true)` works on macOS and Linux. It "does nothing on Windows". [docs] Same page.
- The option `visibleOnFullScreen` shows the window above full-screen windows on macOS. [docs] Same page.
- The window type `panel` on macOS "enables the window to float on top of full-screened apps". [docs] [BaseWindow options](https://www.electronjs.org/docs/latest/api/structures/base-window-options)

### Thin, no frame, transparent

- `frame: false` removes the frame. `transparent: true` makes the background transparent. [docs] [Custom window styles](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles)
- On Windows, transparency needs a frameless window. [docs] [BaseWindow options](https://www.electronjs.org/docs/latest/api/structures/base-window-options)
- Transparent windows cannot change size. [docs] [Custom window styles](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles)
- On Wayland, frameless windows get a shadow by default. Set `hasShadow: false`. [docs] Same page.

### Click-through

- By default "you cannot click through the transparent area". [docs] [Custom window styles](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles)
- `setIgnoreMouseEvents(true)` makes the whole window click-through. [docs] [Custom window interactions](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions)
- The option `forward: true` still sends mouse-move events to the page. [docs] Same page.
- So the page can switch click-through on and off under the mouse. The docs show this pattern. [docs] Same page.
- `forward` works on macOS and Windows only. [docs] Same page.
- `setIgnoreMouseEvents` works on X11 and Wayland. [docs] [BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)

### Screen space and the Dock or taskbar

- Electron gives the work area of each display. [docs] [Display](https://www.electronjs.org/docs/latest/api/structures/display)
- The app can put the strip at the bottom of the work area. That is directly above the Dock or taskbar. [inference]
- Electron has no documented option that reserves screen space. [inference] I found none in the window docs.
- On Wayland, an app cannot set its window position. [docs] [BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)
- The docs give a way around it. Start the app with `--ozone-platform=x11`. [docs] Same page.
- That uses XWayland (an X11 layer inside Wayland). I did not test the result on GNOME. [not verified]

### Size and memory

- "Zipped Electron apps are usually around 80 to 100 Megabytes." Most apps use over 100 MB on disk. [docs] [Why Electron](https://www.electronjs.org/docs/latest/why-electron)
- The empty Electron v45.2.3 release is 115 to 150 MiB zipped, by platform. [measured] From the release file sizes on GitHub.
- Four Electron apps on one Mac had frameworks of 209 to 277 MB on disk. [measured] With `du`.
- Electron runs one main process and one more process for each window. [docs] [Process model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- The docs give no memory number. [docs] They say a system web view "will sometimes use fewer resources".
- Blogs report 130 to 410 MB for small Electron apps. The test methods are not clear. [community]

### TypeScript + Canvas 2D

- Yes, with no rewrite. The page runs in Chromium on every platform. [docs] [Why Electron](https://www.electronjs.org/docs/latest/why-electron)
- The game behaves the same on macOS, Windows and Linux. [inference] It is the same engine.

### Install and update

- macOS and Windows block unsigned apps by default. Users need several manual steps to open them. [docs] [Code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- macOS needs signing and notarization (Apple's automatic check of an app). [docs] Same page.
- Signing for macOS needs the paid Apple Developer Program. [docs] Same page.
- On Windows, the docs name a cloud signing service as the cheapest option. It is not available in all countries. [docs] Same page.
- Auto-update is built in for macOS and Windows only. [docs] [autoUpdater](https://www.electronjs.org/docs/latest/api/auto-updater)
- "There is no built-in support for auto-updater on Linux." [docs] Same page.
- On macOS the app must be signed for auto-update. [docs] Same page.
- A free update service exists for apps with a public GitHub repository. [docs] [Updating applications](https://www.electronjs.org/docs/latest/tutorial/updates)
- This repository is public. So that service fits. [inference]

## Tauri v2

Tauri uses the web view (built-in browser part) of each system. The shell code is Rust. [docs] [What is Tauri](https://v2.tauri.app/start/)

### Always on top

- `setAlwaysOnTop` exists. The docs list no platform limit. [docs] [window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/)
- It does not work on Wayland. A maintainer agreed in the tracker. [tracker] [tao#1134](https://github.com/tauri-apps/tao/issues/1134)
- `setVisibleOnAllWorkspaces` exists. It is not supported on Windows. [docs] [window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/)
- Tauri has no documented option for "above full-screen apps" on macOS. [docs] I found none.
- An open issue reports that the window does not show above full-screen apps. [tracker] [tauri#9557](https://github.com/tauri-apps/tauri/issues/9557)
- A contributor suggests the accessory activation policy as a fix. Nobody confirmed it there. [tracker] [tao#189 comment](https://github.com/tauri-apps/tao/issues/189#issuecomment-2069020970)
- A community plugin turns a Tauri window into an NSPanel. [community] [tauri-nspanel](https://github.com/ahkohd/tauri-nspanel)
- So Tauri needs that plugin or own native code for this point. [inference] This is the first risk.

### Thin, no frame, transparent

- `decorations: false` removes the frame. `transparent: true` makes the window transparent. [docs] [window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/)
- On macOS, transparency used a private Apple interface behind a config flag. [docs] [config](https://v2.tauri.app/reference/config/)
- The flag does nothing from Tauri 2.12.1. The interface is always on now. [docs] Same page.
- Window shadow control is not supported on Linux. [docs] [window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/)

### Click-through

- `setIgnoreCursorEvents(true)` makes the whole window click-through. [docs] [window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/)
- The docs show no option that forwards mouse-move events to the page. [docs] I found none.
- So the page cannot see the mouse while click-through is on. [inference]
- Click-through for the empty parts only needs own code. [inference] For example, Rust code reads the mouse position on a timer.
- This is the second risk.

### Screen space and the Dock or taskbar

- Tauri has no documented option that reserves screen space. [inference] I found none.
- Tauri gives the native window handle to Rust code on Linux. [docs] [WebviewWindow](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindow.html)
- A user made a `wlr-layer-shell` panel with Tauri this way. [tracker] [tauri#15913](https://github.com/tauri-apps/tauri/issues/15913)
- The same user says the needed GTK 3 library is no longer maintained. [community] Same issue.

### Size and memory

- "A minimal Tauri app can be less than 600KB in size." [docs] [What is Tauri](https://v2.tauri.app/start/)
- The reason: the app does not include a browser engine. [docs] Same page.
- The docs give no memory number. [docs]
- Blogs report 40 to 170 MB for small Tauri apps. [community]
- Most tests show less memory than Electron. One Windows test shows almost no difference. [community]
- The web view still uses memory. It runs in system processes. [inference]

### TypeScript + Canvas 2D

- Yes, with no rewrite. But the engine is different on each system. [docs] [Webview versions](https://v2.tauri.app/reference/webview-versions/)
  - Windows: WebView2 (Chromium). It updates itself.
  - macOS: WKWebView (WebKit). It updates with the system.
  - Linux: WebKitGTK. The version depends on the Linux distribution.
- Canvas 2D is a standard web interface. All three engines have it. [inference]
- Speed and small drawing details can differ. Test the game on all three. [inference]

### Install and update

- The updater plugin works on Windows, macOS and Linux (AppImage). [docs] [Updater](https://v2.tauri.app/plugin/updater/)
- Each update must have a signature from your own key. "This cannot be disabled." [docs] Same page.
- If you lose the key, you cannot update the installed apps. [docs] Same page.
- The updater can read a static JSON file from GitHub Releases. [docs] Same page.
- macOS signing needs a paid Apple account, 99 dollars per year. [docs] [macOS signing](https://v2.tauri.app/distribute/sign/macos/)
- A free Apple account cannot notarize. [docs] Same page.
- An ad-hoc (no identity) signature does not remove the macOS warning. [docs] Same page.
- Windows does not need signing to run an app. Unsigned apps get a SmartScreen warning. [docs] [Windows signing](https://v2.tauri.app/distribute/sign/windows/)
- Windows 11 Smart App Control blocks unsigned apps fully. [docs] Same page.

## Native macOS: NSPanel or menu bar app

- An NSPanel is a special window for helper content. [docs] [NSPanel](https://developer.apple.com/documentation/appkit/nspanel)
- It can do every strip behaviour on macOS. See the macOS section above. [docs] [community]
- A menu bar item (NSStatusItem) lives in the menu bar at the top. [docs] [NSStatusItem](https://developer.apple.com/documentation/appkit/nsstatusitem)
- So a menu bar item cannot be the bottom strip. [inference] It can be a small extra, for example a level counter.
- The game is TypeScript + Canvas 2D. A native panel must hold a web view to run it. [inference]
- That is the same design as Tauri on macOS, but built by hand. [inference]
- It does not run on Windows or Linux. [inference]
- Install and update need own work. Signing and notarization rules are the same. [docs] [Notarizing macOS software](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)

## Other candidate: Wails

- Wails is like Tauri, with Go in place of Rust. It also uses the system web view. [docs] [Wails options](https://wails.io/docs/reference/options/)
- Version 2 has options for always-on-top, frameless and transparent windows. [docs] Same page.
- I found no option for click-through or for all desktops in that page. [docs] I searched the page source.
- So Wails offers less than Tauri for this strip. I did not study it further.

## Known problems by platform

### macOS

- The strip cannot reserve space. Other windows go under it. [inference]
- To sit above the Dock, the strip must follow `visibleFrame`. The value changes with Dock size. [docs]
- With an auto-hide Dock, the Dock appears over a low-level strip. [inference from the level numbers]
- Above full-screen apps needs a panel, a high level and the accessory policy. [community]
- The accessory policy removes the Dock icon and the app menu. [community] The app then needs another way to quit.
- Electron documents all of this as options. Tauri needs a plugin or native code. [docs] [tracker]

### Windows

- No public way exists to show one window on all virtual desktops. [docs]
- Electron and Tauri both say their all-desktops option does not work on Windows. [docs]
- An appbar can reserve space. Neither shell has it built in. It needs native code. [inference]
- I did not verify how a topmost window behaves above full-screen games. [not verified]
- Unsigned apps show a SmartScreen warning. [docs]

### Linux

- X11: both shells should work like on Windows. I did not test it. [inference]
- Wayland: no always-on-top and no position control for normal windows. [docs]
- Wayland with KDE, Sway or Hyprland: a layer-shell panel is possible. It needs native code. [docs] [tracker]
- Wayland with GNOME: no layer-shell. No shell can make a real strip. [docs]
- Fallback on GNOME: run through XWayland, or show a normal window. [inference] Not tested.
- Electron has no auto-update on Linux. Tauri has it for AppImage. [docs]

## How 20 to 30 engineers install and update it

The steps are almost the same for Electron and Tauri.

1. Build the installers in CI (the automatic build system) for each platform.
2. Publish them as GitHub Releases. Both updaters can read from there. [docs]
3. macOS: sign and notarize. This needs one paid Apple Developer account. [docs]
4. Windows: sign, or tell users to accept the SmartScreen warning. [docs]
5. Linux: give an AppImage (one file that runs on most distributions). [docs for Tauri]

Without signing on macOS, each engineer must approve the app by hand. [docs]
Electron auto-update on macOS does not work without signing. [docs]
For a first test with a few people, unsigned builds are acceptable. [inference]
For 20 to 30 people, signing on macOS is worth the cost. [inference]

## Recommendation

**Build the prototype in Electron. Keep the game free of shell code. Then test Tauri v2.**

Reasons:

1. Electron documents every strip behaviour for macOS and Windows as an option.
   This includes the two hard ones: above full-screen apps, and click-through with mouse forwarding.
2. Tauri v2 needs a community plugin or native code for both hard points.
   That is a risk for a prototype. The prototype must test the game, not the shell.
3. Electron uses one browser engine. The game looks the same on all platforms.
4. The cost of Electron is size and memory. About 100 MB download is acceptable for engineers.
   Memory is the real question, because the strip runs all day.
5. The game is plain TypeScript + Canvas 2D. It runs in both shells with no change.
   So the choice is cheap to change later, if the shell code stays small and separate.

When to change to Tauri v2:

- The Electron prototype uses too much memory in a real work day. Measure it.
- And a short Tauri trial proves the two hard points on macOS.

Design advice that follows from the facts:

- Do not plan for reserved screen space. macOS cannot do it. Draw the strip over other windows.
- Make the window only as high as the strip. Then few empty parts need click-through.
- Put the strip at the bottom of the work area. That is directly above the Dock or taskbar.
- Treat GNOME on Wayland as "normal window only" for now.
- A native macOS panel is not a good choice. It only runs on macOS and needs a web view anyway.

## What I could not verify

- Nobody ran a test build. All "yes" answers come from docs, not from a test.
- Memory numbers. No official source gives them. Community numbers disagree.
- Electron above full-screen apps on the newest macOS. The docs say yes. Not tested.
- Tauri above full-screen apps with the plugin or the accessory policy. Not tested.
- Tauri transparency on macOS without the private interface flag. One docs line says it. Not tested.
- Windows: a topmost window above a full-screen game. Not checked.
- Windows: the exact styles that make a window click-through. The shells hide this. Not checked.
- X11: how a window reserves screen space. Not checked.
- GNOME on Wayland through XWayland. Position and always-on-top may or may not work. Not tested.
- If the Tauri updater on macOS needs an Apple signature. The docs do not say it.
- Wails version 3. I only read the version 2 options page.

## Sources

Official docs, read on 2026-11-10:

- Electron: [BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window), [BaseWindow options](https://www.electronjs.org/docs/latest/api/structures/base-window-options), [Custom window styles](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles), [Custom window interactions](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions), [Display](https://www.electronjs.org/docs/latest/api/structures/display), [Why Electron](https://www.electronjs.org/docs/latest/why-electron), [Process model](https://www.electronjs.org/docs/latest/tutorial/process-model), [Code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing), [autoUpdater](https://www.electronjs.org/docs/latest/api/auto-updater), [Updating applications](https://www.electronjs.org/docs/latest/tutorial/updates)
- Tauri v2: [What is Tauri](https://v2.tauri.app/start/), [window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/), [config](https://v2.tauri.app/reference/config/), [Webview versions](https://v2.tauri.app/reference/webview-versions/), [Updater](https://v2.tauri.app/plugin/updater/), [macOS signing](https://v2.tauri.app/distribute/sign/macos/), [Windows signing](https://v2.tauri.app/distribute/sign/windows/), [WebviewWindow (Rust)](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindow.html)
- Apple: [NSWindow.Level](https://developer.apple.com/documentation/appkit/nswindow/level-swift.struct), [NSPanel](https://developer.apple.com/documentation/appkit/nspanel), [canJoinAllSpaces](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/canjoinallspaces), [fullScreenAuxiliary](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/fullscreenauxiliary), [canJoinAllApplications](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/canjoinallapplications), [nonactivatingPanel](https://developer.apple.com/documentation/appkit/nswindow/stylemask-swift.struct/nonactivatingpanel), [ignoresMouseEvents](https://developer.apple.com/documentation/appkit/nswindow/ignoresmouseevents), [visibleFrame](https://developer.apple.com/documentation/appkit/nsscreen/visibleframe), [NSStatusItem](https://developer.apple.com/documentation/appkit/nsstatusitem), [Notarizing macOS software](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
- Microsoft: [Extended Window Styles](https://learn.microsoft.com/en-us/windows/win32/winmsg/extended-window-styles), [Application Desktop Toolbars](https://learn.microsoft.com/en-us/windows/win32/shell/application-desktop-toolbars), [IVirtualDesktopManager](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nn-shobjidl_core-ivirtualdesktopmanager)
- Wayland: [xdg-shell](https://wayland.app/protocols/xdg-shell), [wlr-layer-shell](https://wayland.app/protocols/wlr-layer-shell-unstable-v1)
- Wails: [options](https://wails.io/docs/reference/options/)

Issue trackers of the tools:

- [electron#50403](https://github.com/electron/electron/issues/50403): always-on-top has no effect on Wayland.
- [tao#1134](https://github.com/tauri-apps/tao/issues/1134): always-on-top does not work on Wayland.
- [tauri#9557](https://github.com/tauri-apps/tauri/issues/9557): window not above full-screen apps on macOS. Open.
- [tauri#15913](https://github.com/tauri-apps/tauri/issues/15913): layer-shell with Tauri.

Community sources:

- [Apple developer forum thread 826308](https://developer.apple.com/forums/thread/826308): overlay above full-screen apps. The answer is from an Apple support engineer.
- [tauri-nspanel](https://github.com/ahkohd/tauri-nspanel): plugin that makes a Tauri window an NSPanel.
- Memory numbers: several blog posts found by web search. I did not check their methods.

Measured on 2026-11-10:

- Electron v45.2.3 release file sizes, from the GitHub release.
- macOS window level numbers, from a Swift script on macOS 27.2.
- Size of the Electron framework in four installed apps, with `du`.
