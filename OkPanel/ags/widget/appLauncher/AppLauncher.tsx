import Apps from "gi://AstalApps"
import Pango from "gi://Pango?version=1.0";
import {Gdk, Gtk} from "ags/gtk4";
import {createComputed, createState, For, Accessor, onCleanup} from "ags";
import {integratedAppLauncherRevealed, toggleIntegratedAppLauncher, launcherInitialText} from "./IntegratedAppLauncher";
import {launchDesktopApp, launchApp} from "../utils/launch";
import {variableConfig} from "../../config/config";
import Gio from "gi://Gio";

// ── Modos especiales del launcher ────────────────────────────────────────────
// "=2+2"      -> calculadora (Enter copia el resultado al portapapeles)
// ">nmap ..." -> ejecuta el comando tal cual (útil para pentest)
type SpecialAction =
    | { kind: "calc"; display: string; value: string }
    | { kind: "command"; display: string; cmd: string }
    | null

/** Evalúa aritmética simple de forma segura (sin identificadores ni llamadas). */
function tryCalc(expr: string): string | null {
    const cleaned = expr.trim()
    if (cleaned === "" || !/^[0-9+\-*/%.()\s]+$/.test(cleaned)) return null
    try {
        // El regex de arriba impide cualquier cosa que no sea aritmética.
        const result = Function(`"use strict"; return (${cleaned});`)()
        if (typeof result === "number" && isFinite(result)) {
            // Redondeo amable para evitar flotantes feos (0.1 + 0.2).
            return String(Math.round(result * 1e10) / 1e10)
        }
    } catch (_) { /* expresión a medio escribir */ }
    return null
}

function parseSpecial(text: string): SpecialAction {
    if (text.startsWith("=")) {
        const expr = text.slice(1).trim()
        if (expr === "") {
            // Guía: aún no hay operación que evaluar.
            return { kind: "calc", display: "Escribe una operación, p. ej. 12 * 3", value: "" }
        }
        const value = tryCalc(expr)
        return value === null
            ? { kind: "calc", display: "= (operación inválida)", value: "" }
            : { kind: "calc", display: `= ${value}`, value }
    }
    if (text.startsWith(">")) {
        const cmd = text.slice(1).trim()
        return { kind: "command", display: cmd === "" ? "Escribe un comando, p. ej. nmap -sV …" : `▶ ${cmd}`, cmd }
    }
    return null
}

function copyToClipboard(value: string) {
    if (value === "") return
    const proc = Gio.Subprocess.new(["wl-copy"], Gio.SubprocessFlags.STDIN_PIPE)
    proc.communicate_utf8_async(value, null, null)
}

interface AppButtonProps {
    app: Apps.Application;
    isSelected: Accessor<boolean>;
}

function ensureChildVisible(scrolledWindow: Gtk.ScrolledWindow, index: number): void {
    const vAdj = scrolledWindow.get_vadjustment();
    const container = scrolledWindow.get_child();
    if (!container || !vAdj) return;

    // Magic number, height of each child
    const height = 48
    const viewStart = vAdj.get_value();
    const viewEnd = viewStart + vAdj.get_page_size();

    const childTop = (height) * index;
    const childBottom = (height * index) + height;

    if (childTop < viewStart) {
        vAdj.set_value(childTop);
    } else if (childBottom > viewEnd) {
        const newValue = childBottom - vAdj.get_page_size();
        vAdj.set_value(Math.min(newValue, vAdj.get_upper() - vAdj.get_page_size()));
    }
}

function AppButton({ app, isSelected }: AppButtonProps) {
    return <button
        canFocus={false}
        cssClasses={isSelected.as(sel => sel ? ["appButton", "selectedAppButton"] : ["appButton"])}
        onClicked={() => {
            toggleIntegratedAppLauncher()
            launchDesktopApp(app)
        }}>
        <box>
            <box
                valign={Gtk.Align.CENTER}
                orientation={Gtk.Orientation.HORIZONTAL}
            >
                <image
                    visible={variableConfig.appLauncher.showAppIcons.asAccessor()}
                    marginEnd={12}
                    pixelSize={24}
                    iconName={app.iconName || "application-x-executable"}
                />
                <label
                    cssClasses={["name"]}
                    xalign={0}
                    label={app.name}
                    ellipsize={Pango.EllipsizeMode.END}
                />
            </box>
        </box>
    </button>
}

export default function () {
    const { CENTER } = Gtk.Align
    let apps = new Apps.Apps()

    const [selectedIndex, selectedIndexSetter] = createState(0)
    const [text, textSetter] = createState("")
    // Acción especial (calculadora / comando) derivada del texto.
    const special = text(parseSpecial)
    const list = text(text => {
        // En modo cálculo/comando no listamos apps.
        if (parseSpecial(text) !== null) {
            selectedIndexSetter(0)
            return new Array<Apps.Application>()
        }
        // Búsqueda difusa de AstalApps (ordena por relevancia); vacío => todas.
        let listApps = text === ""
            ? apps.exact_query("")
            : apps.fuzzy_query(text)
        if (listApps.length - 1 < selectedIndex.get()) {
            if (listApps.length === 0) {
                selectedIndexSetter(0)
            } else {
                selectedIndexSetter(listApps.length - 1)
            }
        }
        return listApps
    })
    const onEnter = () => {
        // Primero, las acciones especiales.
        const action = special.get()
        if (action !== null) {
            if (action.kind === "calc") {
                copyToClipboard(action.value)
            } else if (action.kind === "command" && action.cmd !== "") {
                launchApp(action.cmd)
            }
            toggleIntegratedAppLauncher()
            return
        }
        if (list.get().length > 0) {
            const app = list.get()?.[selectedIndex.get()]
            if (app != null) {
                launchDesktopApp(app)
            }
        }
        toggleIntegratedAppLauncher()
    }
    let textEntryBox: Gtk.Entry | null = null

    const scrolledWindow = (
        <Gtk.ScrolledWindow
            class="scrollWindow"
            vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
            propagateNaturalHeight={true}
            canFocus={false}
        >
            <box
                spacing={6}
                orientation={Gtk.Orientation.VERTICAL}
                marginBottom={6}>
                <For each={list} id={(it) => it.name}>
                    {(app, index) => {
                        let indexes = createComputed([
                            selectedIndex,
                            index
                        ])
                        return <AppButton
                            app={app}
                            isSelected={indexes(s => s[1] === s[0])}/>
                    }}
                </For>
                <box
                    halign={CENTER}
                    orientation={Gtk.Orientation.VERTICAL}
                    marginBottom={8}
                    visible={createComputed([list, special], (l, a) => l.length === 0 && a === null)}>
                    <label
                        cssClasses={["labelSmall"]}
                        label="No match found"/>
                </box>
            </box>
        </Gtk.ScrolledWindow>
    ) as Gtk.ScrolledWindow

    const unsub = integratedAppLauncherRevealed.subscribe(() => {
        if (integratedAppLauncherRevealed.get()) {
            apps = new Apps.Apps()
            // Texto inicial (vacío normalmente; "=" si se abre desde la tecla calc).
            const initial = launcherInitialText.get()
            textSetter(initial)
            selectedIndexSetter(0)
            if (textEntryBox != null) {
                textEntryBox.text = initial
                // grab_focus() normal selecciona todo el texto, así que el "="
                // prellenado se borraría al escribir. Esta variante enfoca sin
                // seleccionar; dejamos el cursor al final.
                textEntryBox.grab_focus_without_selecting()
                textEntryBox.set_position(-1)
            }
        }
    })
    onCleanup(unsub)

    return <box
        $={(self) => {
            let keyController = new Gtk.EventControllerKey()

            keyController.connect("key-pressed", (_, key) => {
                if (key === Gdk.KEY_Escape) {
                    toggleIntegratedAppLauncher()
                } else if (key === Gdk.KEY_Down && list.get().length - 1 > selectedIndex.get()) {
                    selectedIndexSetter(selectedIndex.get() + 1)
                    ensureChildVisible(scrolledWindow, selectedIndex.get())
                    return true
                } else if (key === Gdk.KEY_Up && selectedIndex.get() != 0) {
                    selectedIndexSetter(selectedIndex.get() - 1)
                    ensureChildVisible(scrolledWindow, selectedIndex.get())
                    return true
                }
                return false
            })

            self.add_controller(keyController)
        }}
        orientation={Gtk.Orientation.VERTICAL}>
        <box
            widthRequest={500}
            cssClasses={["appLauncher"]}
            orientation={Gtk.Orientation.VERTICAL}>
            <box
                orientation={Gtk.Orientation.HORIZONTAL}>
                <label
                    cssClasses={["searchIcon"]}
                    label=""/>
                <entry
                    cssClasses={["searchField"]}
                    placeholderText="Buscar    ·    =cálculo    ·    >comando"
                    onActivate={onEnter}
                    hexpand={true}
                    $={(self) => {
                        textEntryBox = self
                        self.connect('changed', () => textSetter(self.text))
                    }}
                />
            </box>
            <button
                visible={special.as(a => a !== null)}
                canFocus={false}
                cssClasses={["appButton", "selectedAppButton"]}
                onClicked={onEnter}>
                <box>
                    <label
                        cssClasses={["name"]}
                        xalign={0}
                        hexpand={true}
                        ellipsize={Pango.EllipsizeMode.END}
                        label={special.as(a => a ? a.display : "")}/>
                    <label
                        cssClasses={["labelSmall"]}
                        halign={Gtk.Align.END}
                        label={special.as(a =>
                            a?.kind === "calc" ? "Enter: copiar"
                                : a?.kind === "command" ? "Enter: ejecutar"
                                    : "")}/>
                </box>
            </button>
            {scrolledWindow}
        </box>
        <box
            vexpand={true}/>
    </box>
}
