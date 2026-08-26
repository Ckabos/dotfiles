import {Bar} from "../../config/bar";
import {variableConfig} from "../../config/config";
import {createBinding, createState, For, With} from "ags";
import {Gtk} from "ags/gtk4";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
import AstalTray from "gi://AstalTray?version=0.1";

const tray = AstalTray.get_default()

// Tracker basado en referencias de memoria para evitar el bug de "duplicate keys" de Chrome
const instanceTracker = new WeakMap<any, string>();
let idCounter = 0;

export default function ({vertical, bar}: { vertical: boolean, bar: Bar }) {
    return <box>
        <With value={variableConfig.barWidgets.tray.collapsable.asAccessor()}>
            {(collapse) => {
                if (collapse) {
                    const [revealed, revealedSetter] = createState(false)
                    return <box
                        orientation={vertical ? Gtk.Orientation.VERTICAL : Gtk.Orientation.HORIZONTAL}>
                        <revealer
                            transitionType={vertical ? Gtk.RevealerTransitionType.SLIDE_DOWN : Gtk.RevealerTransitionType.SLIDE_RIGHT}
                            revealChild={revealed}>
                            <TrayContent vertical={vertical}/>
                        </revealer>
                        <OkButton
                            labelCss={["barTrayForeground"]}
                            backgroundCss={["barTrayBackground"]}
                            hpadding={getHPadding(bar)}
                            vpadding={getVPadding(bar)}
                            offset={1}
                            visible={createBinding(tray, "items").as((items) => items.length > 0)}
                            label={"󱊔"}
                            onClicked={() => {
                                revealedSetter(!revealed.get())
                            }}/>
                    </box>
                } else {
                    return <TrayContent vertical={vertical}/>
                }
            }}
        </With>
    </box>
}

function TrayContent({vertical}: { vertical: boolean }) {
    return <box
        orientation={vertical ? Gtk.Orientation.VERTICAL : Gtk.Orientation.HORIZONTAL}
        visible={createBinding(tray, "items").as((items) => items.length > 0)}>
        <For 
            each={createBinding(tray, "items")} 
            id={(item: AstalTray.TrayItem) => {
                if (!item) return `empty-${Math.random()}`;
                
                if (!instanceTracker.has(item)) {
                    instanceTracker.set(item, `tray-item-${idCounter++}`);
                }
                return instanceTracker.get(item)!;
            }}
        >
            {(item: AstalTray.TrayItem) => {
                if (!item) return <box/>;

                let notifyId: number;

                return <menubutton
                    cssClasses={["trayMenuButton"]}
                    tooltipMarkup={createBinding(item, "tooltipMarkup")}
                    menuModel={createBinding(item, "menuModel")}
                    onDestroy={() => {
                        // Limpieza al destruir el widget para evitar deadlocks en DBus
                        if (item && notifyId > 0) {
                            item.disconnect(notifyId);
                        }
                    }}
                    $={(self: Gtk.MenuButton) => {
                        // Hook de inicialización usando '$' para compatibilidad con gnim
                        const updateActionGroup = () => {
                            const group = item.get_action_group();
                            if (group) {
                                self.insert_action_group("dbusmenu", group);
                            }
                        };

                        updateActionGroup();
                        notifyId = item.connect("notify::action-group", updateActionGroup);
                    }}>
                    <image gicon={createBinding(item, "gicon")}/>
                </menubutton>
            }}
        </For>
    </box>
}
