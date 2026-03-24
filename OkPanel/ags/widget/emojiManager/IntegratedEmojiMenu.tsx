import { Gtk } from "ags/gtk4";
import Gdk from "gi://Gdk?version=4.0";
import { createState } from "ags";
import EmojiManager from "./EmojiManager";

export const integratedEmojiMenuWidth = 410

export const [integratedEmojiMenuRevealed, integratedEmojiMenuRevealedSetting] = createState(false)

export function toggleIntegratedEmojiMenu() {
    integratedEmojiMenuRevealedSetting(!integratedEmojiMenuRevealed.get())
}

export function closeIntegratedEmojiMenu() {
    integratedEmojiMenuRevealedSetting(false)
}

export default function () {
    return <revealer
        hexpand={false}
        transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
        revealChild={integratedEmojiMenuRevealed}
        $={(self) => {
            const keyCtrl = new Gtk.EventControllerKey();
            keyCtrl.connect("key-pressed", (_, keyval) => {
                if (keyval === Gdk.KEY_Escape) {
                    closeIntegratedEmojiMenu();
                    return true;
                }
                return false;
            });
            self.add_controller(keyCtrl);
        }}
    >
        <box
            cssClasses={["scrollWindow"]}
            vexpand={true}
            widthRequest={integratedEmojiMenuWidth}>
            <EmojiManager/>
        </box>
    </revealer>
}
