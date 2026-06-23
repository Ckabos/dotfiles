import {execAsync} from "ags/process";
import {sleep} from "./async";

function showColorPickerNotification(
    color: string
) {
    execAsync([
        "bash",
        "-c",
        `
            ACTION_VIEW="viewScreenshot"
            ACTION_OPEN_DIR="openDir"
            # Send a notification with an action to view the file
            notify-send "Copied color ${color} to clipboard" \
                --app-name="Color Picker"
        `
    ]).catch((error) => {
        console.error(error)
    }).then((value) => {
        console.log(value)
    })
}

export async function runColorPicker(sleepDuration: number = 0) {
    await sleep(sleepDuration)
    execAsync('hyprpicker').catch((error) => {
        console.error(error)
    }).then((value) => {
        console.log(value)
        if (typeof value !== "string") {
            return
        }
        const match = value.match(/#[0-9A-Fa-f]{6,8}/);

        const color = match ? match[0] : null
        if (color === null) {
            return
        }

        execAsync([
            "bash",
            "-c",
            `nohup wl-copy "${color}" >/dev/null 2>&1 &`
        ]).catch((error) => {
            console.error(error)
        }).finally(() => {
            showColorPickerNotification(color)
        })
    })
}