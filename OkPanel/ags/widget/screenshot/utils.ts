import {execAsync} from "ags/process"
import {createState} from "ags";
import GLib from "gi://GLib?version=2.0";

export enum SaveType {
    BOTH = 0,
    CLIPBOARD = 1,
    FILE = 2,
}

export const saveTypeValues = (Object.values(SaveType) as SaveType[]).filter((v): v is SaveType => typeof v === "number")

export const delayOptions = [
    0,
    1,
    2,
    3,
    5,
    10
]

export let screenshotDir = ""

export function getSaveTypeLabel(value: SaveType) {
    switch (value) {
        case SaveType.BOTH:
            return "Save to file and clipboard"
        case SaveType.CLIPBOARD:
            return "Save to clipboard"
        case SaveType.FILE:
            return "Save to file"
    }
}

export function getSaveTypeIcon(value: SaveType) {
    switch (value) {
        case SaveType.BOTH:
            return ""
        case SaveType.CLIPBOARD:
            return "󱉨"
        case SaveType.FILE:
            return ""
    }
}

export function showScreenshotNotification(filePath: string, saveType: SaveType) {
    const appName = "Screenshot"
    switch (saveType) {
        case SaveType.FILE:
            showSavedNotification(filePath, appName)
            break
        case SaveType.CLIPBOARD:
            showCopiedNotification(appName)
            break
        case SaveType.BOTH:
            showSavedAndCopiedNotification(filePath, appName)
            break
    }

}

export function showSavedNotification(
    filePath: string,
    appName: string
) {
    execAsync([
        "bash",
        "-c",
        `
        ACTION_VIEW="viewScreenshot"
        ACTION_OPEN_DIR="openDir"
        # Send a notification with an action to view the file
        notify-send "File saved at ${filePath}" \
            --app-name="${appName}" \
            --action=$ACTION_VIEW="View" \
            --action=$ACTION_OPEN_DIR="Show in Files" |
        while read -r action; do
            if [[ "$action" == $ACTION_OPEN_DIR ]]; then
                xdg-open "$(dirname "${filePath}")"
            fi
            if [[ "$action" == $ACTION_VIEW ]]; then
                xdg-open ${filePath}
            fi
        done
    `
    ]).catch((error) => {
        console.error(error)
    }).then((value) => {
        console.log(value)
    })
}

export function showSavedAndCopiedNotification(
    filePath: string,
    appName: string
) {
    execAsync([
        "bash",
        "-c",
        `
        ACTION_VIEW="viewScreenshot"
        ACTION_OPEN_DIR="openDir"
        # Send a notification with an action to view the file
        notify-send "Image copied to clipboard and file saved at ${filePath}" \
            --app-name="${appName}" \
            --action=$ACTION_VIEW="View" \
            --action=$ACTION_OPEN_DIR="Show in Files" |
        while read -r action; do
            if [[ "$action" == $ACTION_OPEN_DIR ]]; then
                xdg-open "$(dirname "${filePath}")"
            fi
            if [[ "$action" == $ACTION_VIEW ]]; then
                xdg-open ${filePath}
            fi
        done
    `
    ]).catch((error) => {
        console.error(error)
    }).then((value) => {
        console.log(value)
    })
}

export function showCopiedNotification(
    appName: string
) {
    execAsync([
        "bash",
        "-c",
        `
        ACTION_VIEW="viewScreenshot"
        ACTION_OPEN_DIR="openDir"
        # Send a notification with an action to view the file
        notify-send "Image copied to clipboard" \
            --app-name="${appName}"
    `
    ]).catch((error) => {
        console.error(error)
    }).then((value) => {
        console.log(value)
    })
}

export function generateFileName(): string {
    const time = GLib.DateTime.new_now_local().format("%Y_%m_%d_%H_%M_%S")!
    return `${time}_screenshot.png`
}

export type AudioSource = {
    name: string;
    description: string;
    isMonitor: boolean;
};

export type Codec = {
    display: string;
    lib: string;
}

export const [audioOptions, audioOptionsSetter] = createState<AudioSource[]>([])
export const codecs: Codec[] = [
    {
        display: "H264",
        lib: "libx264"
    },
    {
        display: "H265",
        lib: "libx265"
    },
]
export const h264EncodingPresets = [
    "ultrafast",
    "superfast",
    "veryfast",
    "faster",
    "fast",
    "medium",
    "slow",
    "slower",
    "veryslow"
]
export const crfQualityValues = [
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26
]

export let screenRecordingDir = ""

export function getEncodingPresetIcon(value: string) {
    if (value.includes("fast")) {
        return "󰓅"
    } else if (value.includes("medium")) {
        return "󰾅"
    } else {
        return "󰾆"
    }
}

export function getCrfQualityIcon(value: number) {
    if (value > 23) {
        return "󰨌"
    } else if (value > 20) {
        return "󰨍"
    } else {
        return "󰐵"
    }
}

export function setDirectories() {
    execAsync([
        "bash",
        "-c",
        `
    mkdir -p $(xdg-user-dir PICTURES)/Screenshots
    echo $(xdg-user-dir PICTURES)/Screenshots
    `
    ]).then((value) => {
        screenshotDir = value
    })

    execAsync([
        "bash",
        "-c",
        `
        mkdir -p $(xdg-user-dir VIDEOS)/ScreenRecordings
        echo $(xdg-user-dir VIDEOS)/ScreenRecordings
        `
    ]).then((value) => {
        screenRecordingDir = value
    })
}

export function updateScreenshotAudioOptions() {
    execAsync([
        "bash",
        "-c",
        `pactl list sources | grep -E "Name:|Description"`
    ]).catch((error) => {
        console.error(error)
    }).then((value) => {
        if (typeof value !== "string") {
            return
        }

        // Split the input into lines
        const lines = value.split('\n');

        // Initialize an empty array to hold the result
        const result: AudioSource[] = [];

        // Iterate through the lines in pairs (Name, Description)
        for (let i = 0; i < lines.length; i += 2) {
            // Ensure the line is not empty and follows the expected format
            const nameLine = lines[i].trim();
            const descriptionLine = lines[i + 1]?.trim();

            // Match the "Name" prefix
            if (nameLine.startsWith("Name: ") && descriptionLine?.startsWith("Description: ")) {
                // Extract the name and description values
                const name = nameLine.replace("Name: ", "");
                const description = descriptionLine.replace("Description: ", "");
                const isMonitor = nameLine.includes("monitor")

                // Add to the result array
                result.push({ name, description, isMonitor });
            }
        }

        audioOptionsSetter(result)
    })
}

export function showScreenRecordingNotification(filePath: string) {
    showSavedNotification(filePath, "Screen Recording")
}