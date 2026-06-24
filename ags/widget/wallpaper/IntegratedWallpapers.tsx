import {Gtk} from "ags/gtk4"
import Gdk from "gi://Gdk?version=4.0"
import {createState} from "ags"
import WallpaperPicker, {loadRemoteWallpapers} from "./WallpaperPicker"

export const integratedWallpapersWidth = 520

export const [integratedWallpapersRevealed, integratedWallpapersRevealedSetting] = createState(false)

export function toggleIntegratedWallpapers() {
    const next = !integratedWallpapersRevealed.get()
    integratedWallpapersRevealedSetting(next)
    if (next) {
        // Carga el álbum remoto la primera vez que se abre (no al arrancar).
        loadRemoteWallpapers()
    }
}

export function closeIntegratedWallpapers() {
    integratedWallpapersRevealedSetting(false)
}

export default function IntegratedWallpapers() {
    const scroller = new Gtk.ScrolledWindow({
        vexpand: true,
        hscrollbar_policy: Gtk.PolicyType.NEVER,
        vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
        child: <WallpaperPicker revealed={integratedWallpapersRevealed}/> as Gtk.Widget,
    })

    return <revealer
        hexpand={false}
        transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
        revealChild={integratedWallpapersRevealed}
        $={(self) => {
            const keyCtrl = new Gtk.EventControllerKey()
            keyCtrl.connect("key-pressed", (_, keyval) => {
                if (keyval === Gdk.KEY_Escape) {
                    closeIntegratedWallpapers()
                    return true
                }
                return false
            })
            self.add_controller(keyCtrl)
        }}
    >
        <box
            cssClasses={["scrollWindow", "clipboardBox"]}
            vexpand={true}
            widthRequest={integratedWallpapersWidth}
            orientation={Gtk.Orientation.VERTICAL}
            marginTop={20}
            marginBottom={20}
            marginStart={20}
            marginEnd={20}>
            <label marginBottom={16} cssClasses={["labelMedium"]} label="󰸉 Wallpapers"/>
            {scroller}
        </box>
    </revealer>
}
