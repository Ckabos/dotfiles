import {Gtk} from "ags/gtk4"
import Gdk from "gi://Gdk?version=4.0"
import {timeout} from "ags/time"
import {createScaledTexture} from "../utils/images"
import {selectedConfig, variableConfig} from "../../config/config"
import {Accessor, createComputed, createState, onCleanup} from "ags"
import {listFilenamesInDir} from "../utils/files"
import {setWallpaper} from "./setWallpaper"
import {listRemoteWallpapers, fetchRemoteWallpaper, RemoteEntry} from "./remoteWallpapers"

// "La última petición gana": al elegir otro fondo se ignora la descarga
// anterior, así un cambio rápido no se bloquea ni deja el picker trabado.
let wallpaperRequestId = 0
const [applying, applyingSetter] = createState<boolean>(false)

// Listas planas (el FlowBox hace el acomodo en rejilla por sí mismo).
const [localPaths, localPathsSetter] = createState<string[]>([])
const [remoteEntries, remoteEntriesSetter] = createState<RemoteEntry[]>([])
const [remoteOnline, remoteOnlineSetter] = createState<boolean>(true)
const [remoteLoading, remoteLoadingSetter] = createState<boolean>(false)
let remoteLoadStarted = false

let localFlowBox: Gtk.FlowBox | null = null
let remoteFlowBox: Gtk.FlowBox | null = null

function updateFiles() {
    const dir = variableConfig.wallpaper.wallpaperDir.get()
    if (dir === "") {
        return
    }
    localPathsSetter(
        listFilenamesInDir(dir)
            .filter((f) => f.includes("jpg") || f.includes("png"))
            .map((f) => `${dir}/${f}`)
    )
}

function loadRemote() {
    remoteLoadingSetter(true)
    listRemoteWallpapers().then((listing) => {
        remoteOnlineSetter(listing.online)
        remoteEntriesSetter(listing.entries)
        remoteLoadingSetter(false)
    }).catch(() => {
        remoteLoadingSetter(false)
    })
}

// Disparada por el launcher al abrirse por primera vez (evita red al arrancar).
export function loadRemoteWallpapers() {
    if (remoteLoadStarted) return
    remoteLoadStarted = true
    loadRemote()
}

// Enfoca (y selecciona) el primer hijo de un FlowBox, para TAB y apertura.
export function focusLocal() {
    focusFlowBox(localFlowBox)
}

function focusFlowBox(fb: Gtk.FlowBox | null) {
    if (!fb) return
    const selected = fb.get_selected_children()
    const child = (selected && selected.length > 0)
        ? selected[0]
        : fb.get_child_at_index(0)
    if (child) {
        fb.select_child(child)
        child.grab_focus()
    }
}

function clearFlowBox(fb: Gtk.FlowBox) {
    let child = fb.get_child_at_index(0)
    while (child) {
        fb.remove(child)
        child = fb.get_child_at_index(0)
    }
}

// Crea la miniatura (la imagen se carga async y se inserta al terminar).
function thumbWidget(path: string): Gtk.Widget {
    const box = <box cssClasses={["wallpaperButton"]}/> as Gtk.Box
    createScaledTexture(140, 70, path).then((texture) => {
        const picture = Gtk.Picture.new_for_paintable(texture)
        picture.heightRequest = 90
        picture.cssClasses = ["wallpaper"]
        picture.contentFit = Gtk.ContentFit.COVER
        box.append(picture)
    }).catch(() => {})
    return box
}

function rebuildLocal() {
    if (!localFlowBox) return
    clearFlowBox(localFlowBox)
    for (const path of localPaths.get()) {
        localFlowBox.append(thumbWidget(path))
    }
}

function rebuildRemote() {
    if (!remoteFlowBox) return
    clearFlowBox(remoteFlowBox)
    for (const entry of remoteEntries.get()) {
        remoteFlowBox.append(thumbWidget(entry.thumb))
    }
}

function applyLocal(index: number) {
    const path = localPaths.get()[index]
    if (!path) return
    // Nuevo id invalida cualquier descarga remota en curso (gana este).
    wallpaperRequestId++
    applyingSetter(false)
    setWallpaper(path).catch((e) => console.error("aplicar local falló:", e))
}

function applyRemote(index: number) {
    const entry = remoteEntries.get()[index]
    if (!entry) return
    const myId = ++wallpaperRequestId

    if (entry.online) {
        // Solo aquí se descarga el full-res, al elegirlo (2-3s).
        applyingSetter(true)
        fetchRemoteWallpaper(entry.hash)
            .then((p) => {
                // Si el usuario ya eligió otro fondo, descartamos este.
                if (myId === wallpaperRequestId) return setWallpaper(p)
            })
            .catch((e) => console.error("fetch remoto falló:", e))
            .finally(() => {
                if (myId === wallpaperRequestId) applyingSetter(false)
            })
    } else {
        // Offline: ya es un full-res local descargado.
        setWallpaper(entry.thumb).catch((e) => console.error("aplicar offline falló:", e))
    }
}

function childCount(fb: Gtk.FlowBox): number {
    let n = 0
    while (fb.get_child_at_index(n)) n++
    return n
}

// Columnas reales de la rejilla: cuenta los hijos que comparten la fila 0
// (misma coordenada Y), usando compute_bounds (GTK4 no tiene get_allocation).
function columnsOf(fb: Gtk.FlowBox): number {
    const first = fb.get_child_at_index(0)
    if (!first) return 1
    const [ok0, r0] = first.compute_bounds(fb)
    const y0 = ok0 ? r0.origin.y : 0
    let cols = 0
    let i = 0
    let c = fb.get_child_at_index(i)
    while (c) {
        const [ok, r] = c.compute_bounds(fb)
        const y = ok ? r.origin.y : 0
        if (Math.abs(y - y0) < 1) {
            cols++
        } else {
            break
        }
        i++
        c = fb.get_child_at_index(i)
    }
    return Math.max(1, cols)
}

function selectAndFocus(fb: Gtk.FlowBox, index: number) {
    const child = fb.get_child_at_index(index)
    if (child) {
        fb.select_child(child)
        child.grab_focus()
    }
}

// Configura selección, rejilla, activación con Enter, flechas y salto con TAB.
function configureFlowBox(
    fb: Gtk.FlowBox,
    onActivate: (index: number) => void,
    other: () => Gtk.FlowBox | null,
) {
    fb.add_css_class("wallpaperGrid")
    fb.set_selection_mode(Gtk.SelectionMode.SINGLE)
    fb.set_max_children_per_line(3)
    fb.set_min_children_per_line(2)
    fb.set_homogeneous(true)
    fb.set_column_spacing(4)
    fb.set_row_spacing(4)
    // Un solo clic aplica el wallpaper (además de Enter con el teclado).
    fb.set_activate_on_single_click(true)
    fb.connect("child-activated", (_, child) => {
        onActivate(child.get_index())
    })

    const keyCtrl = new Gtk.EventControllerKey()
    keyCtrl.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
    keyCtrl.connect("key-pressed", (_, keyval) => {
        // TAB (o Shift+TAB) salta a la otra sección.
        if (keyval === Gdk.KEY_Tab || keyval === Gdk.KEY_ISO_Left_Tab) {
            focusFlowBox(other())
            return true
        }

        // Navegación 2D manual (la interna del FlowBox no se comporta aquí).
        const count = childCount(fb)
        if (count === 0) return false
        const selected = fb.get_selected_children()
        const idx = (selected && selected.length > 0) ? selected[0].get_index() : 0
        const cols = columnsOf(fb)

        let next = idx
        if (keyval === Gdk.KEY_Right) next = idx + 1
        else if (keyval === Gdk.KEY_Left) next = idx - 1
        else if (keyval === Gdk.KEY_Down) next = idx + cols
        else if (keyval === Gdk.KEY_Up) next = idx - cols
        else return false

        // Dentro de rango: mover. Fuera: consumir sin salir de la sección.
        if (next >= 0 && next < count) {
            selectAndFocus(fb, next)
        }
        return true
    })
    fb.add_controller(keyCtrl)
}

export default function WallpaperPicker({revealed}: { revealed?: Accessor<boolean> }) {
    const unsubConfig = selectedConfig.asAccessor().subscribe(() => {
        if (selectedConfig.get() != undefined) {
            updateFiles()
        }
    })
    onCleanup(unsubConfig)
    updateFiles()

    const unsubLocal = localPaths.subscribe(rebuildLocal)
    const unsubRemote = remoteEntries.subscribe(rebuildRemote)
    onCleanup(unsubLocal)
    onCleanup(unsubRemote)

    // Al abrir el launcher: enfoca la sección local para navegar de inmediato.
    if (revealed) {
        const unsubReveal = revealed.subscribe(() => {
            if (revealed.get()) {
                timeout(150, () => focusFlowBox(localFlowBox))
            }
        })
        onCleanup(unsubReveal)
    }

    return <box orientation={Gtk.Orientation.VERTICAL}>
        <label
            cssClasses={["labelMediumBold"]}
            halign={Gtk.Align.START}
            label="Locales"/>
        <box marginTop={6}/>
        <Gtk.FlowBox
            $={(fb) => {
                localFlowBox = fb
                configureFlowBox(fb, applyLocal, () => remoteFlowBox)
                rebuildLocal()
            }}/>

        <box marginTop={18}/>
        <label
            cssClasses={["labelMediumBold"]}
            halign={Gtk.Align.START}
            label={createComputedLabel()}/>
        <box marginTop={6}/>
        <Gtk.FlowBox
            $={(fb) => {
                remoteFlowBox = fb
                configureFlowBox(fb, applyRemote, () => localFlowBox)
                rebuildRemote()
            }}/>
    </box>
}

// Etiqueta reactiva del estado del álbum remoto.
function createComputedLabel(): Accessor<string> {
    return createComputed([
        remoteLoading, remoteOnline, remoteEntries, applying
    ], (loading, online, entries, isApplying) => {
        if (loading) return "Álbum remoto · cargando…"
        if (entries.length === 0) return "Álbum remoto · vacío"
        if (isApplying) return "Álbum remoto · descargando y aplicando…"
        return online
            ? "Álbum remoto  (TAB para cambiar de sección)"
            : "Álbum remoto · sin conexión (descargados)"
    })
}
