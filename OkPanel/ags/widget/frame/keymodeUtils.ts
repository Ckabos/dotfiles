import {Astal, Gtk} from "ags/gtk4";
import {frameWindow} from "./Frame";

export function wireEntryFocus(entry: Gtk.Entry) {
    const fc = new Gtk.EventControllerFocus();

    fc.connect("enter", () => {
        // user focused the entry -> allow typing
        frameWindow.set_keymode(Astal.Keymode.ON_DEMAND);
    });

    fc.connect("leave", () => {
        // focus moved away -> stop grabbing keys so other apps can take focus
        frameWindow.set_keymode(Astal.Keymode.NONE);
    });

    entry.add_controller(fc);
}