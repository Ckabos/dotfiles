import {Gtk} from "ags/gtk4"
import {getBluetoothIcon, getBluetoothName} from "../../utils/bluetooth";
import Bluetooth from "gi://AstalBluetooth";
import RevealerRow from "../../common/RevealerRow";
import OkButton from "../../common/OkButton";
import {createBinding, createComputed, createState, For, onCleanup, With} from "ags";
import {execAsync} from "ags/process";
import {integratedMenuRevealed} from "../IntegratedMenu";

function BluetoothDevices() {
    const bluetooth = Bluetooth.get_default()

    const devicesBinding = createComputed([
        createBinding(bluetooth, "devices")
    ], (devices) => {
        return devices.filter((device) => {
            return device.name != null
        })
    })

    return <box
        orientation={Gtk.Orientation.VERTICAL}>
        <With value={devicesBinding}>
            {(devices: Bluetooth.Device[]) => {
                if (devices.length === 0) {
                    return <label
                        cssClasses={["labelMedium"]}
                        label="Sin dispositivos"/>
                } else {
                    return <box/>
                }
            }}
        </With>
        <For each={devicesBinding}>
            {(device) => {
                const [buttonsRevealed, buttonsRevealedSetter] = createState(false)
                const connectionState = createComputed([
                    createBinding(device, "connected"),
                    createBinding(device, "connecting")
                ])

                return <box
                    orientation={Gtk.Orientation.VERTICAL}>
                    <OkButton
                        hexpand={true}
                        label={`  ${device.name}`}
                        labelHalign={Gtk.Align.START}
                        onClicked={() => {
                            buttonsRevealedSetter(!buttonsRevealed.get())
                        }}/>
                    <revealer
                        revealChild={buttonsRevealed}
                        transitionDuration={200}
                        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}>
                        <box
                            orientation={Gtk.Orientation.VERTICAL}
                            marginTop={4}
                            marginBottom={4}
                            spacing={4}>
                            <OkButton
                                primary={true}
                                hexpand={true}
                                visible={createBinding(device, "paired")}
                                label={connectionState((value) => {
                                    const connected = value[0]
                                    const connecting = value[1]
                                    if (connecting) {
                                        return "Conectando"
                                    } else if (connected) {
                                        return "Desconectar"
                                    } else {
                                        return "Conectar"
                                    }
                                })}
                                onClicked={() => {
                                    if (device.connecting) {
                                        // do nothing
                                    } else if (device.connected) {
                                        device.disconnect_device((device, result, data) => {
                                            console.log("device disconnected")
                                        })
                                    } else {
                                        device.connect_device((device, result, data) => {
                                            console.log("device connected")
                                        })
                                    }
                                }}/>
                            <OkButton
                                primary={true}
                                hexpand={true}
                                visible={createBinding(device, "paired")}
                                label={createBinding(device, "trusted").as((trusted) => {
                                    if (trusted) {
                                        return "No confiar"
                                    } else {
                                        return "Confiar"
                                    }
                                })}
                                onClicked={() => {
                                    device.set_trusted(!device.trusted)
                                }}/>
                            <OkButton
                                primary={true}
                                hexpand={true}
                                label={createBinding(device, "paired").as((paired) => {
                                    return paired ? "Unpair" : "Pair"
                                })}
                                onClicked={() => {
                                    if (device.paired) {
                                        bluetooth.adapter.remove_device(device)
                                    } else {
                                        // device.pair() falla sin un agente de bluetooth
                                        // registrado (no hay blueman/bt-agent corriendo).
                                        // bluetoothctl trae su propio agente: emparejar,
                                        // confiar y conectar de un solo clic.
                                        const mac = device.address
                                        execAsync(["bash", "-c",
                                            `bluetoothctl --timeout 25 pair ${mac} && ` +
                                            `bluetoothctl trust ${mac} && ` +
                                            `bluetoothctl --timeout 25 connect ${mac}`
                                        ]).catch(() => {
                                            execAsync(["notify-send", "-a", "OkPanel", "Bluetooth",
                                                `No se pudo emparejar ${device.name}. ¿Está en modo de emparejamiento?`]).catch(() => {})
                                        })
                                    }
                                }}/>
                        </box>
                    </revealer>
                </box>
            }}
        </For>
    </box>
}

export default function () {
    const bluetooth = Bluetooth.get_default()

    return <RevealerRow
        setup={(revealed) => {
            const unsub = integratedMenuRevealed.subscribe(() => {
                if (!integratedMenuRevealed.get()) {
                    revealed[1](false)
                }
            })
            onCleanup(unsub)
        }}
        visible={createBinding(bluetooth, "isPowered")}
        icon={getBluetoothIcon()}
        iconOffset={0}
        content={
            <label
                cssClasses={["labelMediumBold"]}
                halign={Gtk.Align.START}
                hexpand={true}
                label={getBluetoothName()}/>
        }
        revealedContent={
            <box
                marginTop={10}
                orientation={Gtk.Orientation.VERTICAL}>
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}>
                    <label
                        halign={Gtk.Align.START}
                        hexpand={true}
                        label="Dispositivos"
                        cssClasses={["labelLargeBold"]}/>
                    <OkButton
                        label={createBinding(bluetooth.adapter, "discovering").as((discovering) => {
                            return discovering ? "Detener búsqueda" : "Buscar"
                        })}
                        onClicked={() => {
                            if (bluetooth.adapter.discovering) {
                                bluetooth.adapter.stop_discovery()
                            } else {
                                bluetooth.adapter.start_discovery()
                            }
                        }}/>
                </box>
                <BluetoothDevices/>
            </box>
        }
    />
}