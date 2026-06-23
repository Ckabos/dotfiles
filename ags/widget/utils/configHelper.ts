import {Gtk} from "ags/gtk4";
import {Alignment} from "../../config/schema/definitions/barWidgets";

export function alignmentToGtk(alignment: Alignment) {
    switch (alignment) {
        case Alignment.CENTER:
            return Gtk.Align.CENTER
        case Alignment.END:
            return Gtk.Align.END
        case Alignment.START:
            return Gtk.Align.START
    }
}