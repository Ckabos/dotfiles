import {resolveWallpaper} from "./getWallpaper";
import {wallpaperPathStateSet} from "./Wallpaper";
import {config} from "../../config/config";
import GLib from "gi://GLib?version=2.0";
import {execAsync} from "ags/process";

export function refreshWallpaper() {
    console.log("refreshing wallpaper")
    const wallpaperPath = resolveWallpaper()
    console.log(`wallpaper path: ${wallpaperPath}`)
    if (wallpaperPath !== null) {
        wallpaperPathStateSet(wallpaperPath)

        const script = config.wallpaper.wallpaperUpdateScript;

        console.log(`script: ${script}`)

        // require an existing, executable script (match your bash guard)
        if (!script || !GLib.file_test(script, GLib.FileTest.EXISTS | GLib.FileTest.IS_EXECUTABLE)) {
            console.log("setWallpaper: wallpaperUpdateScript missing or not executable:", script);
        } else {
            execAsync(`${GLib.shell_quote(script)} ${GLib.shell_quote(wallpaperPath)}`)
                .catch((e) => {
                    console.error("Failed to refresh wallpaper")
                    console.error(e)
                })
                .finally(() => {
                    console.log("wallpaper update script finished")
                })
        }
    }
}