import App from "ags/gtk4/app"
import OkButton from "./OkButton";
import {hideAllWindows} from "../utils/windows";
import Astal from "gi://Astal?version=4.0";
import {Gdk, Gtk} from "ags/gtk4";

export default function(
    message: string,
    confirm: string,
    deny: string,
    onConfirm: () => void,
): Astal.Window {
    return <window
        widthRequest={400}
        heightRequest={150}
        application={App}
        exclusivity={Astal.Exclusivity.NORMAL}
        layer={Astal.Layer.OVERLAY}
        cssClasses={["window"]}
        visible={true}
        keymode={Astal.Keymode.ON_DEMAND}
        $={(self) => {
            let keyController = new Gtk.EventControllerKey()

            keyController.connect("key-pressed", (_, key) => {
                if (key === Gdk.KEY_Escape) {
                    hideAllWindows()
                }
            })

            self.add_controller(keyController)
        }}>
        <box
            orientation={Gtk.Orientation.VERTICAL}>
            <label
                marginStart={20}
                marginEnd={20}
                marginTop={20}
                marginBottom={20}
                vexpand={true}
                label={message}
                cssClasses={["labelLarge"]}/>
            <box
                orientation={Gtk.Orientation.HORIZONTAL}>
                <OkButton
                    label={deny}
                    hexpand={true}
                    onClicked={() => {
                        hideAllWindows()
                    }}/>
                <OkButton
                    label={confirm}
                    hexpand={true}
                    onClicked={() => {
                        hideAllWindows()
                        onConfirm()
                    }}/>
            </box>
        </box>
    </window> as Astal.Window
}