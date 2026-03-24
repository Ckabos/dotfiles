import PowerProfiles from "gi://AstalPowerProfiles"
import {createBinding} from "ags";

export enum PowerProfile {
    PowerSaver = "power-saver",
    Balanced = "balanced",
    Performance = "performance",
}

export function getPowerProfileIconBinding() {
    const powerProfiles = PowerProfiles.get_default()

    return createBinding(powerProfiles, "activeProfile").as((profile) => {
        if (profile === PowerProfile.PowerSaver) {
            return "󰾆"
        } else if (profile === PowerProfile.Balanced) {
            return "󰾅"
        } else {
            return "󰓅"
        }
    })
}