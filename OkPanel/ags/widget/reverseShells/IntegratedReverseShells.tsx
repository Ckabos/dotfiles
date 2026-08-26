import { Gtk } from "ags/gtk4";
import Gdk from "gi://Gdk?version=4.0";
import { createState } from "ags";
import { ReverseShellGenerator } from "./ReverseShellGenerator";

export const integratedReverseShellsWidth = 460;

export const [integratedReverseShellsRevealed, integratedReverseShellsRevealedSetting] = createState(false);

export function toggleIntegratedReverseShells() {
    integratedReverseShellsRevealedSetting(!integratedReverseShellsRevealed.get());
}

export function closeIntegratedReverseShells() {
    integratedReverseShellsRevealedSetting(false);
}

export default function IntegratedReverseShells() {
    return <revealer
        hexpand={false}
        transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
        revealChild={integratedReverseShellsRevealed}
        $={(self) => {
            const keyCtrl = new Gtk.EventControllerKey();
            keyCtrl.connect("key-pressed", (_, keyval) => {
                if (keyval === Gdk.KEY_Escape) {
                    closeIntegratedReverseShells();
                    return true;
                }
                return false;
            });
            self.add_controller(keyCtrl);
        }}
    >
        <box
            cssClasses={["scrollWindow", "clipboardBox"]}
            vexpand={true}
            widthRequest={integratedReverseShellsWidth}
            orientation={Gtk.Orientation.VERTICAL}
            marginTop={20}
            marginBottom={20}
            marginStart={20}
            marginEnd={20}>
            <label marginBottom={16} cssClasses={["labelMedium"]} label="󰌌 Reverse Shell Generator" />
            <ReverseShellGenerator
                onClose={() => closeIntegratedReverseShells()}
                revealed={integratedReverseShellsRevealed}/>
        </box>
    </revealer>;
}
