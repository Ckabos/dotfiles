import {Gtk} from "ags/gtk4";
import {variableConfig} from "../../config/config";
import {createBinding, createState, onCleanup} from "ags";
import EndpointControls from "./widgets/EndpointControls";
import Wp from "gi://AstalWp"
import {getMicrophoneIcon, getVolumeIcon} from "../utils/audio";
import MediaPlayers from "./widgets/MediaPlayers";
import NotificationHistory from "../notification/NotificationHistory";
import NetworkControls from "./widgets/NetworkControls";
import BluetoothControls from "./widgets/BluetoothControls";
import LookAndFeelControls from "./widgets/LookAndFeelControls";
import PowerProfileControls from "./widgets/PowerProfileControls";
import Clock from "./widgets/Clock";
import {SystemMenuWidget} from "../../config/schema/definitions/systemMenuWidgets";
import {appendChildren, removeAllChildren} from "../utils/widgets";
import QuickActions from "./widgets/QuickActions";

// Validación de seguridad para evitar crashes si el servicio de audio no está listo
const wp = Wp.get_default();
const audio = wp ? wp.audio : null;

export const integratedMenuWidth = 430

export const [integratedMenuRevealed, integratedMenuRevealedSetting] = createState(false)

export function toggleIntegratedMenu() {
    integratedMenuRevealedSetting(!integratedMenuRevealed.get())
}

export function closeIntegratedMenu() {
    integratedMenuRevealedSetting(false)
}

let mainBox: Gtk.Box

// Bandera Singleton para evitar fugas de memoria y Stacks duplicados en GTK
let widgetsInitialized = false;

let network: Gtk.Widget
let bluetooth: Gtk.Widget
let audioOut: Gtk.Widget | null = null
let audioIn: Gtk.Widget | null = null
let powerProfile: Gtk.Widget
let lookAndFeel: Gtk.Widget
let mpris: Gtk.Widget
let notificationHistory: Gtk.Widget
let clock: Gtk.Widget
let quickActions1: Gtk.Widget
let quickActions2: Gtk.Widget

function initSystemWidgets() {
    if (widgetsInitialized) return; // Si ya existen en memoria, no los re-creamos

    network = <NetworkControls/> as Gtk.Widget
    bluetooth = <BluetoothControls/> as Gtk.Widget
    
    if (audio) {
        audioOut = <EndpointControls
            defaultEndpoint={audio.default_speaker}
            endpointsBinding={createBinding(audio, "speakers")}
            getIcon={getVolumeIcon}/> as Gtk.Widget
        audioIn = <EndpointControls
            defaultEndpoint={audio.default_microphone}
            endpointsBinding={createBinding(audio, "microphones")}
            getIcon={getMicrophoneIcon}/> as Gtk.Widget
    }

    powerProfile = <PowerProfileControls/> as Gtk.Widget
    lookAndFeel = <LookAndFeelControls/> as Gtk.Widget
    mpris = <MediaPlayers/> as Gtk.Widget
    notificationHistory = <NotificationHistory/> as Gtk.Widget
    clock = <Clock/> as Gtk.Widget
    quickActions1 = <QuickActions
        actions={variableConfig.systemMenu.quickActions1.actions.asAccessor()}
        maxSize={variableConfig.systemMenu.quickActions1.maxPerRow.asAccessor()}
    /> as Gtk.Widget
    quickActions2 = <QuickActions
        actions={variableConfig.systemMenu.quickActions2.actions.asAccessor()}
        maxSize={variableConfig.systemMenu.quickActions2.maxPerRow.asAccessor()}
    /> as Gtk.Widget

    widgetsInitialized = true;
}

function getListOfWidgets(widgets: SystemMenuWidget[]): Gtk.Widget[] {
    return [...new Set(
        widgets.map((widget) => {
            switch (widget) {
                case SystemMenuWidget.NETWORK: return network;
                case SystemMenuWidget.NOTIFICATION_HISTORY: return notificationHistory;
                case SystemMenuWidget.BLUETOOTH: return bluetooth;
                case SystemMenuWidget.CLOCK: return clock;
                case SystemMenuWidget.AUDIO_OUT: return audioOut || <box/> as Gtk.Widget;
                case SystemMenuWidget.AUDIO_IN: return audioIn || <box/> as Gtk.Widget;
                case SystemMenuWidget.LOOK_AND_FEEL: return lookAndFeel;
                case SystemMenuWidget.MPRIS_PLAYERS: return mpris;
                case SystemMenuWidget.POWER_PROFILE: return powerProfile;
                case SystemMenuWidget.QUICK_ACTIONS_1: return quickActions1;
                case SystemMenuWidget.QUICK_ACTIONS_2: return quickActions2;
            }
        })
    )]
}

export default function () {
    const unsub = variableConfig.systemMenu.widgets.asAccessor().subscribe(() => {
        if (!mainBox) return;
        removeAllChildren(mainBox)
        appendChildren(mainBox, getListOfWidgets(variableConfig.systemMenu.widgets.get()))
    })
    onCleanup(unsub)

    return <revealer
        hexpand={false}
        transitionType={Gtk.RevealerTransitionType.SLIDE_RIGHT}
        revealChild={integratedMenuRevealed}>
        <Gtk.ScrolledWindow
            cssClasses={["scrollWindow"]}
            vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
            propagateNaturalHeight={true}
            widthRequest={integratedMenuWidth}>
            <box
                marginTop={20}
                marginStart={20}
                marginEnd={20}
                marginBottom={20}
                orientation={Gtk.Orientation.VERTICAL}
                spacing={10}
                $={(self) => {
                    mainBox = self
                    initSystemWidgets() // Instanciación segura
                    appendChildren(self, getListOfWidgets(variableConfig.systemMenu.widgets.get()))
                }}/>
        </Gtk.ScrolledWindow>
    </revealer>
}
