const Applet = imports.ui.applet;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;

class MusicApplet extends Applet.Applet {

    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);

        this.box = new St.BoxLayout({
            style_class: "panel-status-menu-box"
        });

        this.actor.add_child(this.box);


        // Botones
        this.prevBtn = this._createButton("◀◀", () => this._send("Previous"));
        this.playBtn = this._createButton("❚❚", () => this._send("PlayPause"));
        this.nextBtn = this._createButton("▶▶", () => this._send("Next"));

        this.trackLabel = new St.Label({
            text: "",
            style_class: "miapplet-track",
            y_align: St.Align.MIDDLE
        });

        this.playLabel = this.playBtn.get_child();

        this.box.add(this.prevBtn);
        this.box.add(this.playBtn);
        this.box.add(this.nextBtn);
        this.box.add(this.trackLabel);

        this.bus = Gio.DBus.session;
        this.players = [];

        this._updatePlayers();
        this.timer = setInterval(() => this._updatePlayers(), 2000);
        this._statusTimer = setInterval(() => this._updatePlaybackStatus(), 1000);
        this._trackTimer = setInterval(() => this._updateTrackInfo(), 1500);    
    }

    _createButton(label, callback) {
        let lbl = new St.Label({
            text: label,
            style_class: "miapplet-label",
            y_align: St.Align.MIDDLE
        });

        let btn = new St.Button({
            child: lbl,
            style_class: "panel-button miapplet-button",
            y_align: St.Align.MIDDLE
        });

        btn.connect("clicked", callback);
        return btn;
    }

    _updatePlaybackStatus() {
        if (this.players.length === 0)
            return;

        this.bus.call(
            this.players[0],
            "/org/mpris/MediaPlayer2",
            "org.freedesktop.DBus.Properties",
            "Get",
            new GLib.Variant("(ss)", [
                "org.mpris.MediaPlayer2.Player",
                "PlaybackStatus"
            ]),
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            (bus, res) => {
                try {
                    let result = bus.call_finish(res);
                    let status = result.deep_unpack()[0].deep_unpack();

                    if (status === "Playing")
                        this.playLabel.set_text("❚❚");
                    else
                        this.playLabel.set_text("▶");

                } catch (e) {
                    logError(e);
                }
            }
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
                    this.players = names.filter(n => n.startsWith("org.mpris.MediaPlayer2."));
                    this.actor.visible = this.players.length > 0;
                } catch (e) {
                    logError(e);
                }
            }
        );
    }

    _updateTrackInfo() {
        if (this.players.length === 0) {
            this.trackLabel.set_text("");
            return;
        }

        this.bus.call(
            this.players[0],
            "/org/mpris/MediaPlayer2",
            "org.freedesktop.DBus.Properties",
            "GetAll",
            new GLib.Variant("(s)", ["org.mpris.MediaPlayer2.Player"]),
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

                    if (status !== "Playing" || !metadata) {
                        this.trackLabel.set_text("");
                        return;
                    }

                    let title = metadata["xesam:title"]?.deep_unpack() || "";
                    let artistArr = metadata["xesam:artist"]?.deep_unpack() || [];
                    let artist = artistArr.length > 0 ? artistArr[0] : "";

                    if (title || artist) {
                        this.trackLabel.set_text(`  ${artist} – ${title}`);
                    } else {
                        this.trackLabel.set_text("");
                    }

                } catch (e) {
                    logError(e);
                    this.trackLabel.set_text("");
                }
            }
        );
    }

    _send(cmd) {
        if (this.players.length === 0)
            return;

        this.bus.call(
            this.players[0],
            "/org/mpris/MediaPlayer2",
            "org.mpris.MediaPlayer2.Player",
            cmd,
            null,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            null
        );
    }

    on_applet_removed_from_panel() {
        clearInterval(this.timer);
        clearInterval(this._statusTimer);
        clearInterval(this._trackTimer);
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new MusicApplet(metadata, orientation, panelHeight, instanceId);
}
