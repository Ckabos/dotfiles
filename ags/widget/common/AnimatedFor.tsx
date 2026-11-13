import Gtk from "gi://Gtk?version=4.0"
import {Accessor, createComputed, createState, For, onCleanup, With} from "ags";
import {timeout} from "ags/time";

function mapToSortedEntries<K, V>(
    m: Map<K, V>,
    cmp?: (a: K, b: K) => number
): [K, V][] {
    const entries = Array.from(m.entries())

    const defaultCmp = (a: K, b: K) => {
        if (typeof a === "number" && typeof b === "number") return a - b
        // fallback: compare as strings, numeric-aware
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" })
    }

    entries.sort(([ka], [kb]) => (cmp ?? defaultCmp)(ka, kb))
    return entries
}

type AnimatedForProps<Item, El extends JSX.Element, Key> = {
    each: Accessor<Iterable<Item>>
    children: (item: Item, index: Accessor<number>) => El
    emptyState?: El,
    reverse?: boolean,
    id?: (item: Item) => Key
    /** Revealer transition type (default: CROSSFADE) */
    transitionType?: Gtk.RevealerTransitionType
    /** Revealer transition duration in ms (default: 220) */
    transitionDuration?: number
    orientation?: Gtk.Orientation
}

/**
 * A wrapper around <For> that animates item removal/exit with Gtk.Revealer.
 * It delays unmounting until the hide animation finishes.
 */
export function AnimatedFor<Item, El extends JSX.Element, Key>({
    each,
    children,
    emptyState,
    reverse = false,
    id = (item: any) => item as any as Key,
    transitionType = Gtk.RevealerTransitionType.CROSSFADE,
    transitionDuration = 220,
    orientation = Gtk.Orientation.VERTICAL,
}: AnimatedForProps<Item, El, Key>) {
    const [rendered, renderedSet] = createState<Map<Key, Item>>(new Map())
    const [exiting, exitingSet] = createState<Map<Key, Item>>(new Map())

    function update() {
        const eachMap = new Map<Key, Item>()
        const newRendered = new Map<Key, Item>(rendered.get())
        const newExiting = new Map<Key, Item>(exiting.get())

        for (const item of each.get()) {
            const k = id(item)
            eachMap.set(k, item)
            newRendered.set(k, item)
        }

        for (const [k, item] of newRendered) {
            if (!eachMap.has(k)) {
                newExiting.set(k, item)
                scheduleRemoval(k)
            }
        }

        renderedSet(newRendered)
        exitingSet(newExiting)
    }

    // Los timers de salida viven AQUÍ, en el scope del AnimatedFor, y no en
    // cada <revealer>. El reconciliador de <For> hace fragment.remove() sobre
    // TODOS sus hijos en cada cambio —no solo sobre los que se van—, así que un
    // revealer se desparenta (y en GTK4 eso puede destruirlo) por el simple
    // hecho de que otro item salió de la lista. Cuando el timer de limpieza
    // colgaba del revealer, esa destrucción incidental lo cancelaba y el item
    // se quedaba atrapado en `rendered` para siempre: notificaciones fantasma
    // que ya no existen en notifd y un panel que no se vacía nunca. Este scope,
    // en cambio, solo muere cuando muere el AnimatedFor entero.
    const exitTimers = new Map<Key, any>()

    function scheduleRemoval(key: Key) {
        if (exitTimers.has(key)) return
        exitTimers.set(key, timeout(transitionDuration + 80, () => {
            exitTimers.delete(key)
            removeItem(key)
        }))
    }

    // Reconcile on each() changes
    const unsub = each.subscribe(() => {
        update()
    })
    update()

    onCleanup(() => {
        unsub()
        exitTimers.forEach((t) => t.cancel())
        exitTimers.clear()
    })

    function removeItem(key: Key) {
        const cur = new Map(rendered.get())
        const exit = new Map(exiting.get())

        exit.delete(key)
        cur.delete(key)

        exitingSet(exit)
        renderedSet(cur)
    }

    const innerList = createComputed([
        rendered,
    ], (map) => {
        const entries = mapToSortedEntries(map)
        if (reverse) {
            return entries.reverse()
        }
        return entries
    })

    // Render via your existing <For>, keyed by .key
    return <box
        orientation={orientation}>
        <For
            each={innerList}
            id={(pair) => pair[0]}>
            {(pair, idx) => {
                const [key, item] = pair
                const [revealed, revealedSet] = createState(false)

                return <revealer
                    $={(self) => {
                        // El revealer SOLO anima. Quitar el item de `rendered` es
                        // responsabilidad del AnimatedFor (ver scheduleRemoval):
                        // este widget se desparenta en cada reconciliación del
                        // <For>, así que no es un sitio fiable para colgar nada
                        // que deba completarse sí o sí.
                        let revealTimer: any = timeout(200, () => {
                            revealTimer = null
                            revealedSet(true)
                        })

                        const isClosing = createComputed([
                            exiting
                        ], (ex) => {
                            return ex.has(key)
                        })

                        // isClosing.subscribe() no se limpia solo: sin desuscribir
                        // en "destroy", cada revealer que alguna vez existió queda
                        // colgado escuchando `exiting` para siempre.
                        const unsubClosing = isClosing.subscribe(() => {
                            if (isClosing.get()) revealedSet(false)
                        })

                        self.connect("destroy", () => {
                            unsubClosing()
                            if (revealTimer !== null) { revealTimer.cancel(); revealTimer = null }
                        })
                    }}
                    revealChild={revealed}>
                    {children(item, idx)}
                </revealer>
            }}
        </For>
        <With value={rendered}>
            {(rendered) => {
                if (rendered.size === 0) {
                    return emptyState
                }
                return <box/>
            }}
        </With>
    </box>
}