# Music Control Applet for Cinnamon

A lightweight and minimal Cinnamon panel applet that allows you to control music playback and view the currently playing track directly from the panel.

This applet uses the **MPRIS (Media Player Remote Interfacing Specification)** standard, which means it works with most modern Linux media players and web browsers.

---

## ✨ Features

- ▶ / ❚❚ **Play / Pause** (dynamic icon based on playback state)
- ◀◀ **Previous track**
- ▶▶ **Next track**
- 🎵 Displays **Artist – Track title**
- 🧠 Automatically hides the track text when:
  - No media is playing
  - Playback is paused
- 📦 Clean and minimal design that integrates naturally with the Cinnamon panel
- 🌐 Works with **browser-based players** (YouTube, Spotify Web, etc.)

---

## 🖥️ Supported Players

Any application that supports **MPRIS**, including:

- Firefox
- Chrome / Chromium
- Spotify (web and desktop)
- VLC
- Rhythmbox
- Other MPRIS-compatible players

---

## ⚙️ How It Works

The applet communicates with media players through **D-Bus** using the MPRIS interface:

- Playback control via:
  - `org.mpris.MediaPlayer2.Player`
- Playback status via:
  - `PlaybackStatus`
- Track information via:
  - `Metadata` (`xesam:title`, `xesam:artist`)

The applet polls the active player at regular intervals to keep the UI updated while remaining lightweight.

---

## 📸 Panel Preview

◀◀ ▶ / ❚❚ ▶▶ Artist – Track Title

When no music is playing, only the control buttons are shown.

## 📁 Installation

1. Copy the applet folder into:

```bash
~/.local/share/cinnamon/applets/
```

2. Ensure the folder name matches the UUID:
```bash
miapplet@music
```

3. Restart Cinnamon:
```bash
cinnamon --replace &
```
4. Add the applet from:
Right click on the panel → Applets

## 🎨 Customization
You can customize the appearance by editing:

- stylesheet.css

- Font size

- Spacing

- Colors

- Icon sizing

The applet is designed to be easily themeable.

## 🧑‍💻 Author

Created as a learning and productivity project for Linux Mint / Cinnamon.

## 📜 License

MIT License
Feel free to use, modify, and share.
