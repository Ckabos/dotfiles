import { Gtk } from "ags/gtk4";
import Gdk from "gi://Gdk?version=4.0";
import { createState } from "ags";
import ClipboardManager from "./ClipboardManager";

export const integratedClipboardManagerWidth = 410;

export const [integratedClipboardManagerRevealed, integratedClipboardManagerRevealedSetting] = createState(false);

export function toggleIntegratedClipboardManager() {
    integratedClipboardManagerRevealedSetting(!integratedClipboardManagerRevealed.get());
}

export function closeIntegratedClipboardManager() {
    integratedClipboardManagerRevealedSetting(false);
}

export default function IntegratedClipboardManager() {
    return <revealer
        hexpand={false}
        transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
        revealChild={integratedClipboardManagerRevealed}
        $={(self) => {
            const keyCtrl = new Gtk.EventControllerKey();
            keyCtrl.connect("key-pressed", (_, keyval) => {
                if (keyval === Gdk.KEY_Escape) {
                    closeIntegratedClipboardManager();
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
            widthRequest={integratedClipboardManagerWidth}>
            <ClipboardManager/>
        </box>
    </revealer>;
}
