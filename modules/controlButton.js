const St = imports.gi.St;

function createControlButton(label, callback) {
    let lbl = new St.Label({
        text: label,
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

module.exports = { createControlButton };
