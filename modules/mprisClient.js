const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const MPRIS_PATH = "/org/mpris/MediaPlayer2";
const MPRIS_PLAYER_IFACE = "org.mpris.MediaPlayer2.Player";
const MPRIS_PREFIX = "org.mpris.MediaPlayer2.";

class MprisClient {
    constructor(callbacks = {}) {
        this._callbacks = callbacks;
        this.bus = Gio.DBus.session;
        this.players = [];
        this.playbackStatus = null;
    }

    start() {
        this._updatePlayers();
        this._playersTimer = setInterval(() => this._updatePlayers(), 2000);
        this._statusTimer = setInterval(() => this._updatePlaybackStatus(), 1000);
        this._trackTimer = setInterval(() => this._updateTrackInfo(), 1500);
    }

    stop() {
        clearInterval(this._playersTimer);
        clearInterval(this._statusTimer);
        clearInterval(this._trackTimer);
    }

    refresh() {
        this._updatePlaybackStatus();
        this._updateTrackInfo();
    }

    togglePlayPause() {
        if (this.playbackStatus === "Playing")
            this.send("Pause");
        else if (this.playbackStatus === "Paused")
            this.send("Play");
        else
            this.send("PlayPause");
    }

    send(cmd) {
        if (this.players.length === 0)
            return;

        this.bus.call(
            this.players[0],
            MPRIS_PATH,
            MPRIS_PLAYER_IFACE,
            cmd,
            null,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            null
        );
    }

    _updatePlayers() {
        this.bus.call(
            "org.freedesktop.DBus",
            "/org/freedesktop/DBus",
            "org.freedesktop.DBus",
            "ListNames",
            null,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            (bus, res) => {
                try {
                    let result = bus.call_finish(res);
                    let names = result.deep_unpack()[0];
                    this.players = names.filter(n => n.startsWith(MPRIS_PREFIX));

                    if (this._callbacks.onPlayersChanged)
                        this._callbacks.onPlayersChanged(this.players);
                } catch (e) {
                    logError(e);
                }
            }
        );
    }

    _updatePlaybackStatus() {
        if (this.players.length === 0)
            return;

        this.bus.call(
            this.players[0],
            MPRIS_PATH,
            "org.freedesktop.DBus.Properties",
            "Get",
            new GLib.Variant("(ss)", [MPRIS_PLAYER_IFACE, "PlaybackStatus"]),
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            (bus, res) => {
                try {
                    let result = bus.call_finish(res);
                    let status = result.deep_unpack()[0].deep_unpack();

                    this.playbackStatus = status;

                    if (this._callbacks.onPlaybackStatus)
                        this._callbacks.onPlaybackStatus(status);
                } catch (e) {
                    logError(e);
                }
            }
        );
    }

    _updateTrackInfo() {
        if (this.players.length === 0) {
            if (this._callbacks.onTrackInfo)
                this._callbacks.onTrackInfo(null);
            return;
        }

        this.bus.call(
            this.players[0],
            MPRIS_PATH,
            "org.freedesktop.DBus.Properties",
            "GetAll",
            new GLib.Variant("(s)", [MPRIS_PLAYER_IFACE]),
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            (bus, res) => {
                try {
                    let result = bus.call_finish(res);
                    let props = result.deep_unpack()[0];

                    let status = props["PlaybackStatus"]?.deep_unpack();
                    let metadata = props["Metadata"]?.deep_unpack();

                    if (!metadata) {
                        if (this._callbacks.onTrackInfo)
                            this._callbacks.onTrackInfo(null);
                        return;
                    }

                    let title = metadata["xesam:title"]?.deep_unpack() || "";
                    let artistArr = metadata["xesam:artist"]?.deep_unpack() || [];
                    let artist = artistArr.length > 0 ? artistArr[0] : "";
                    let artUrl = metadata["mpris:artUrl"]?.deep_unpack() || null;

                    if (this._callbacks.onTrackInfo)
                        this._callbacks.onTrackInfo({ status, title, artist, artUrl });

                } catch (e) {
                    logError(e);
                    if (this._callbacks.onTrackInfo)
                        this._callbacks.onTrackInfo(null);
                }
            }
        );
    }
}

module.exports = MprisClient;
