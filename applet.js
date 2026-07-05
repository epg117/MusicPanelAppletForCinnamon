const Applet = imports.ui.applet;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;

const MprisClient = require('./modules/mprisClient');
const TrackPopup = require('./modules/trackPopup');
const { createControlButton } = require('./modules/controlButton');

class MusicApplet extends Applet.Applet {

    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);

        const PopupMenu = imports.ui.popupMenu;
        const Settings = imports.ui.settings;

        this.settings = new Settings.AppletSettings(this, metadata.uuid, instanceId);

        this.showControls = true;
        this.showLabel = true;

        this.settings.bind(
            "show-controls",
            "showControls",
            () => this._updateControlsVisibility(),
            null
        );

        this.settings.bind(
            "show-label",
            "showLabel",
            () => this._updateLabelVisibility(),
            null
        );

        this.showControlsSwitch = new PopupMenu.PopupSwitchMenuItem(
            "Show controls",
            this.showControls
        );

        this.showControlsSwitch.connect("toggled", (item, state) => {
            if (this.showControls !== state) {
                this.showControls = state;
                this._updateControlsVisibility();
            }
        });

        this._applet_context_menu.addMenuItem(this.showControlsSwitch);

        this.showLabelSwitch = new PopupMenu.PopupSwitchMenuItem(
            "Show title",
            this.showLabel
        );

        this.showLabelSwitch.connect("toggled", (item, state) => {
            if (this.showLabel !== state) {
                this.showLabel = state;
                this._updateLabelVisibility();
            }
        });

        this._applet_context_menu.addMenuItem(this.showLabelSwitch);

        this.box = new St.BoxLayout({
            style_class: "panel-status-menu-box",
            vertical: false
        });

        this.box.set_y_align(Clutter.ActorAlign.CENTER);

        this.actor.add_child(this.box);

        // Buttons
        this.prevBtn = createControlButton("⏮", () => this.mpris.send("Previous"));
        this.playBtn = createControlButton("❚❚", () => this.mpris.togglePlayPause());
        this.nextBtn = createControlButton("⏭", () => this.mpris.send("Next"));

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

        this.mpris = new MprisClient({
            onPlayersChanged: (players) => this._onPlayersChanged(players),
            onPlaybackStatus: (status) => this._onPlaybackStatus(status),
            onTrackInfo: (info) => this._onTrackInfo(info)
        });

        this.popup = new TrackPopup({
            applet: this,
            orientation,
            menuManager: this._menuManager,
            onPrevious: () => this.mpris.send("Previous"),
            onTogglePlayPause: () => this.mpris.togglePlayPause(),
            onNext: () => this.mpris.send("Next")
        });

        this.popup.onOpenStateChanged((open) => {
            if (open)
                this.mpris.refresh();
        });

        this._updateLabelVisibility();
        this._updateControlsVisibility();

        this.mpris.start();
    }

    on_applet_clicked(event) {
        this.popup.toggle();
    }

    _updateLabelVisibility() {
        let visible = this.showLabel;
        if (this.showLabelSwitch && this.showLabelSwitch.state !== visible)
            this.showLabelSwitch.setToggleState(visible);

        this.trackLabel.visible = visible;
    }

    _updateControlsVisibility() {
        let visible = this.showControls;
        if (this.showControlsSwitch && this.showControlsSwitch.state !== visible)
            this.showControlsSwitch.setToggleState(visible);

        this.prevBtn.visible = visible;
        this.playBtn.visible = visible;
        this.nextBtn.visible = visible;
    }

    _onPlayersChanged(players) {
        this.actor.visible = players.length > 0;
    }

    _onPlaybackStatus(status) {
        let icon = status === "Playing" ? "⏸" : "▸";
        this.playLabel.set_text(icon);
        this.popup.setPlayIcon(icon);
    }

    _onTrackInfo(info) {
        if (!info) {
            this.trackLabel.set_text("");
            this.set_applet_tooltip("");
            this.popup.setTitle("");
            this.popup.setArtist("");
            this.popup.setArtwork(null);
            return;
        }

        let { status, title, artist, artUrl } = info;

        let fullTitle = artist && title
            ? `${artist} – ${title}`
            : title || artist;

        // Tooltip = Always show text if exists
        this.set_applet_tooltip(fullTitle || "");

        // Panel = Only show text when it's playing.
        // This is to avoid visual disturbance while you're not listening to anything.
        if (status === "Playing" && fullTitle) {
            this.trackLabel.set_text("  " + fullTitle);
        } else {
            this.trackLabel.set_text("");
        }

        this.popup.setTitle(title || fullTitle || "Sin título");
        this.popup.setArtist(artist || "");
        this.popup.setArtwork(artUrl);
    }

    on_applet_removed_from_panel() {
        this.mpris.stop();
        this.popup.destroy();
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new MusicApplet(metadata, orientation, panelHeight, instanceId);
}
