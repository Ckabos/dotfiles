 import {Bar} from "../../config/bar";

import GLib from "gi://GLib?version=2.0";

import {createBinding, createComputed} from "ags";

import OkButton from "../common/OkButton";

import {getHPadding, getVPadding} from "./BarWidgets";

import {playBatteryWarning} from "../utils/audio";

import {getBatteryIcon} from "../utils/battery";

import AstalBattery from "gi://AstalBattery"


export default function ({bar}: { bar: Bar }) {

    const battery = AstalBattery.get_default()


    let batteryWarningInterval: GLib.Source | null = null


    const batteryVar = createComputed([

        createBinding(battery, "percentage"),

        createBinding(battery, "state")

    ])


    return <OkButton

        labelCss={["barBatteryForeground"]}

        backgroundCss={["barBatteryBackground"]}

        hpadding={getHPadding(bar)}

        vpadding={getVPadding(bar)}

        warning={batteryVar((value) => {

            if (value[0] > 0.04 || battery.state === AstalBattery.State.CHARGING) {

                if (batteryWarningInterval != null) {

                    batteryWarningInterval.destroy()

                    batteryWarningInterval = null

                }

                return false

            } else {

                if (batteryWarningInterval === null && battery.isBattery) {

                    batteryWarningInterval = setInterval(() => {

                        playBatteryWarning()

                    }, 120_000)

                    playBatteryWarning()

                }

                return true

            }

        })}

        label={batteryVar(() => `${getBatteryIcon(battery)} ${Math.round(battery.percentage * 100)}%`)}

        visible={createBinding(battery, "isBattery")}/>

} 
