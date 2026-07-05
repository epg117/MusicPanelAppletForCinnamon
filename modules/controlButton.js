const St = imports.gi.St;

const DEFAULT_ICON_SIZE = 16;

function createControlButton(iconName, callback, iconSize = DEFAULT_ICON_SIZE) {
    let icon = new St.Icon({
        icon_name: iconName,
        icon_type: St.IconType.SYMBOLIC,
        icon_size: iconSize,
        y_align: St.Align.MIDDLE
    });

    let btn = new St.Button({
        child: icon,
        style_class: "panel-button miapplet-button",
        y_align: St.Align.MIDDLE
    });

    btn.connect("clicked", callback);
    return btn;
}

module.exports = { createControlButton };
