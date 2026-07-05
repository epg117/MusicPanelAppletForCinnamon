const Applet = imports.ui.applet;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Clutter = imports.gi.Clutter;
const Util = imports.misc.util;
const Slider = imports.ui.slider.Slider;

const { createControlButton } = require('./modules/controlButton');

const COVER_SIZE = 150;
const POPUP_ICON_SIZE = 24;
const VOLUME_ICON_SIZE = 16;

// How long to ignore incoming volume updates after the user drags the
// slider, so periodic polling doesn't fight with the interaction.
const VOLUME_SUPPRESS_MICROS = 1500000;

class TrackPopup {
    constructor({ applet, orientation, menuManager, onPrevious, onTogglePlayPause, onNext, onVolumeChange }) {
        this._lastArtUrl = undefined;
        this._coverTmpFile = null;
        this._coverLoadHandle = 0;
        this._volumeSuppressUntil = 0;

        this.menu = new Applet.AppletPopupMenu(applet, orientation);
        menuManager.addMenu(this.menu);

        this._build(onPrevious, onTogglePlayPause, onNext, onVolumeChange);
    }

    _build(onPrevious, onTogglePlayPause, onNext, onVolumeChange) {
        let container = new St.BoxLayout({
            style_class: "miapplet-popup",
            vertical: true
        });

        this.coverBin = new St.Bin({
            style_class: "miapplet-popup-cover",
            x_align: St.Align.MIDDLE
        });
        this._setDefaultCover();

        this.titleLabel = new St.Label({
            text: "",
            style_class: "miapplet-popup-title"
        });
        this.titleLabel.clutterText.line_wrap = true;

        this.artistLabel = new St.Label({
            text: "",
            style_class: "miapplet-popup-artist"
        });
        this.artistLabel.clutterText.line_wrap = true;

        let controlsBox = new St.BoxLayout({
            vertical: false,
            style_class: "miapplet-popup-controls"
        });
        controlsBox.set_x_align(Clutter.ActorAlign.CENTER);

        this.prevBtn = createControlButton("media-skip-backward-symbolic", onPrevious, POPUP_ICON_SIZE);
        this.playBtn = createControlButton("media-playback-start-symbolic", onTogglePlayPause, POPUP_ICON_SIZE);
        this.nextBtn = createControlButton("media-skip-forward-symbolic", onNext, POPUP_ICON_SIZE);
        this.playLabel = this.playBtn.get_child();

        controlsBox.add(this.prevBtn);
        controlsBox.add(this.playBtn);
        controlsBox.add(this.nextBtn);

        let volumeBox = new St.BoxLayout({
            vertical: false,
            style_class: "miapplet-popup-volume"
        });
        volumeBox.set_y_align(Clutter.ActorAlign.CENTER);

        this.volumeIcon = new St.Icon({
            icon_name: "audio-volume-high-symbolic",
            icon_type: St.IconType.SYMBOLIC,
            icon_size: VOLUME_ICON_SIZE,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.volumeSlider = new Slider(1);
        this.volumeSlider.actor.x_expand = true;
        this.volumeSlider.connect("value-changed", (slider, value) => {
            this._volumeSuppressUntil = GLib.get_monotonic_time() + VOLUME_SUPPRESS_MICROS;
            if (onVolumeChange)
                onVolumeChange(value);
        });

        volumeBox.add(this.volumeIcon);
        volumeBox.add(this.volumeSlider.actor, { expand: true });

        container.add(this.coverBin);
        container.add(this.titleLabel);
        container.add(this.artistLabel);
        container.add(controlsBox);
        container.add(volumeBox);

        this.menu.addActor(container);
    }

    toggle() {
        this.menu.toggle();
    }

    onOpenStateChanged(callback) {
        this.menu.connect("open-state-changed", (menu, open) => callback(open));
    }

    setTitle(text) {
        this.titleLabel.set_text(text || "");
    }

    setArtist(text) {
        this.artistLabel.set_text(text || "");
    }

    setPlayIcon(iconName) {
        this.playLabel.set_icon_name(iconName);
    }

    setVolume(value) {
        if (GLib.get_monotonic_time() < this._volumeSuppressUntil)
            return;

        this.volumeSlider.setValue(value);

        let iconName;
        if (value <= 0)
            iconName = "audio-volume-muted-symbolic";
        else if (value < 0.34)
            iconName = "audio-volume-low-symbolic";
        else if (value < 0.67)
            iconName = "audio-volume-medium-symbolic";
        else
            iconName = "audio-volume-high-symbolic";

        this.volumeIcon.set_icon_name(iconName);
    }

    setArtwork(artUrl) {
        if (this._lastArtUrl === artUrl)
            return;
        this._lastArtUrl = artUrl;

        if (!artUrl) {
            this._setDefaultCover();
            return;
        }

        if (artUrl.startsWith("http://") || artUrl.startsWith("https://")) {
            if (!this._coverTmpFile)
                this._coverTmpFile = Gio.file_new_tmp("XXXXXX.miapplet-cover")[0];

            Util.spawn_async(
                ["wget", "-q", artUrl, "-O", this._coverTmpFile.get_path()],
                () => this._loadCoverFile(this._coverTmpFile.get_path())
            );
        } else if (artUrl.startsWith("data:image/")) {
            let base64 = artUrl.split(",")[1];
            if (!base64)
                return;

            if (!this._coverTmpFile)
                this._coverTmpFile = Gio.file_new_tmp("XXXXXX.miapplet-cover")[0];

            this._coverTmpFile.replace_contents(
                GLib.base64_decode(base64),
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null
            );
            this._loadCoverFile(this._coverTmpFile.get_path());
        } else {
            let path = decodeURIComponent(artUrl.replace("file://", ""));
            this._loadCoverFile(path);
        }
    }

    _loadCoverFile(path) {
        if (!path || !GLib.file_test(path, GLib.FileTest.EXISTS)) {
            this._setDefaultCover();
            return;
        }

        this._coverLoadHandle = St.TextureCache.get_default().load_image_from_file_async(
            path,
            COVER_SIZE,
            COVER_SIZE,
            (cache, handle, actor) => {
                if (handle !== this._coverLoadHandle)
                    return;
                this.coverBin.set_child(actor);
            }
        );
    }

    _setDefaultCover() {
        this.coverBin.set_child(new St.Icon({
            icon_name: "media-optical",
            icon_type: St.IconType.FULLCOLOR,
            icon_size: COVER_SIZE
        }));
    }

    destroy() {
        if (this._coverTmpFile) {
            try {
                this._coverTmpFile.delete(null);
            } catch (e) {
                logError(e);
            }
        }
    }
}

module.exports = TrackPopup;
