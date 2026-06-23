import {Astal, Gtk} from "ags/gtk4";
import {createState, onCleanup} from "ags";
import AppLauncher from "./AppLauncher";
import {frameWindow} from "../frame/Frame";

export const integratedAppLauncherWidth = 500

export const [integratedAppLauncherRevealed, integratedAppLauncherRevealedSetting] = createState(false)

// Texto con el que se prellenará el campo de búsqueda al abrir (p. ej. "=" para
// abrir directo en modo calculadora desde la tecla dedicada del teclado).
export const [launcherInitialText, launcherInitialTextSetter] = createState("")

export function toggleIntegratedAppLauncher() {
    if (!integratedAppLauncherRevealed.get()) {
        launcherInitialTextSetter("")
    }
    integratedAppLauncherRevealedSetting(!integratedAppLauncherRevealed.get())
}

/** Abre el launcher con el campo prellenado. La tecla de calculadora lo usa
 *  con "=" para entrar directo al modo cálculo. */
export function openAppLauncherWithText(initialText: string) {
    launcherInitialTextSetter(initialText)
    integratedAppLauncherRevealedSetting(true)
}

export function closeIntegratedAppLauncher() {
    integratedAppLauncherRevealedSetting(false)
}

export default function () {
    const unsub = integratedAppLauncherRevealed.subscribe(() => {
        if (integratedAppLauncherRevealed.get()) {
            frameWindow.keymode = Astal.Keymode.EXCLUSIVE
        } else {
            frameWindow.keymode = Astal.Keymode.NONE
        }
    })
    onCleanup(unsub)

    return <revealer
        hexpand={false}
        transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
        revealChild={integratedAppLauncherRevealed}>
        <AppLauncher/>
    </revealer>
}