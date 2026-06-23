import App from "ags/gtk4/app"
import {ChargingAlertSound} from "./widget/alerts/Alerts";
import {NotificationSound} from "./widget/notification/NotificationSound";
import {updateResponse, updateWindows} from "./widget/screenshare/Screenshare";
import {decreaseVolume, increaseVolume, muteVolume} from "./widget/utils/audio";
import Hyprland from "gi://AstalHyprland"
import AstalNotifd from "gi://AstalNotifd?version=0.1"

export const projectDir = `/home/efrain/OkPanel/ags`;

import {setThemeBasic} from "./config/theme";
import {closeIntegratedScreenshot, toggleIntegratedScreenshot} from "./widget/screenshot/IntegratedScreenshot";
import {closeIntegratedAppLauncher, toggleIntegratedAppLauncher, openAppLauncherWithText, integratedAppLauncherRevealed} from "./widget/appLauncher/IntegratedAppLauncher";
import {closeIntegratedScreenshare, toggleIntegratedScreenshare} from "./widget/screenshare/IntegratedScreenshare";
import {closeIntegratedMenu, toggleIntegratedMenu} from "./widget/systemMenu/IntegratedMenu";
import {closeIntegratedCalendar, toggleIntegratedCalendar} from "./widget/calendar/IntegratedCalendar";
import {
    closeIntegratedClipboardManager,
    toggleIntegratedClipboardManager
} from "./widget/clipboardManager/IntegratedClipboardManager";
import {
    closeIntegratedEmojiMenu,
    toggleIntegratedEmojiMenu
} from "./widget/emojiManager/IntegratedEmojiMenu";
import {
    closeIntegratedNotificationsHistory,
    toggleIntegratedNotificationHistory
} from "./widget/notification/IntegratedNotificationHistory";
import {
    closeIntegratedReverseShells,
    toggleIntegratedReverseShells
} from "./widget/reverseShells/IntegratedReverseShells";
import {customWidgetLabelSetters} from "./widget/barWidgets/CustomWidget";
import {setWallpaper} from "./widget/wallpaper/setWallpaper";
import {killOldMonitorWindows, spawnMonitorWindows} from "./widget/utils/windows";
import {getHyprMonitorInfoById} from "./widget/utils/monitors";

App.start({
    instanceName: "OkPanel",
    css: "/tmp/OkPanel/style.css",
    main() {
        setThemeBasic()

        const hyprland = Hyprland.get_default()

        ChargingAlertSound()
        NotificationSound()

        hyprland.monitors.forEach((monitor) => {
            spawnMonitorWindows({
                id: monitor.id,
                name: monitor.name,
                width: monitor.width,
                height: monitor.height,
            })
        })

        hyprland.connect("monitor-added", (_: any, monitor: Hyprland.Monitor) => {
            if (monitor === undefined || monitor === null) return
            if (monitor.id === undefined || monitor.id === null) return

            getHyprMonitorInfoById(monitor.id)
                .then((hyprMonitorInfo) => {
                    if (hyprMonitorInfo === null) return
                    spawnMonitorWindows(hyprMonitorInfo)
                })
        });

        hyprland.connect("monitor-removed", () => {
            console.log(`Monitor removed`)
            killOldMonitorWindows();
        });
    },
    requestHandler(request: string[], res: (response: any) => void) {
        const command = request[0] ?? ""
        if (command.startsWith("custom")) {
            const widgetNumber = Number(request[1])
            if (isNaN(widgetNumber)) {
                res("invalid number")
                return
            }
            const setter = customWidgetLabelSetters.get(widgetNumber)
            if (setter === undefined) {
                res("widget number not in use")
                return
            }
            setter(request[2])
            res("applied custom label")
        } else if (command.startsWith("volume-up")) {
            increaseVolume()
            res("volume up")
        } else if (command.startsWith("volume-down")) {
            decreaseVolume()
            res("volume down")
        } else if (command.startsWith("mute")) {
            muteVolume()
            res("mute")
        } else if (command === "appLauncher") {
            toggleIntegratedAppLauncher()
            res("app launcher toggled")
        } else if (command === "calc") {
            // Tecla XF86Calculator: alterna. Si está abierto, cierra; si no,
            // abre el launcher directo en modo calculadora ("=").
            if (integratedAppLauncherRevealed.get()) {
                closeIntegratedAppLauncher()
                res("calculator closed")
            } else {
                openAppLauncherWithText("=")
                res("calculator opened")
            }
        } else if (command.startsWith("screenshare")) {
            updateWindows(command)
            updateResponse(res)
            toggleIntegratedScreenshare()
        } else if (command === "screenshot") {
            toggleIntegratedScreenshot()
            res("screenshot toggled")
        } else if (command === "menu") {
            toggleIntegratedMenu()
            res("menu toggled")
        } else if (command === "calendar") {
            toggleIntegratedCalendar()
            res("calendar toggled")
        } else if (command === "clipboard") {
            toggleIntegratedClipboardManager()
            res("clipboard toggled")
        } else if (command === "reverseShells") {
            toggleIntegratedReverseShells()
            res("reverse shells toggled")
        } else if (command === "emojis") {
            toggleIntegratedEmojiMenu()
            res("emojis toggled")
        } else if (command === "notification") {
            toggleIntegratedNotificationHistory()
            res("notifications toggled")
        } else if (command === "dnd") {
            // Alterna "No molestar": silencia pop-ups y sonido de notificación.
            const notifd = AstalNotifd.get_default()
            notifd.dontDisturb = !notifd.dontDisturb
            res(notifd.dontDisturb ? "dnd on" : "dnd off")
        } else if (command === "closeAll") {
            closeIntegratedAppLauncher()
            closeIntegratedCalendar()
            closeIntegratedClipboardManager()
            closeIntegratedEmojiMenu()
            closeIntegratedMenu()
            closeIntegratedScreenshare()
            closeIntegratedNotificationsHistory()
            closeIntegratedScreenshot()
            closeIntegratedReverseShells()
            res("closed all")
        } else if (command.startsWith("wallpaper")) {
            const path = request.slice(1).join(" ")
            setWallpaper(path)
                .finally(() => {
                    res("wallpaper set")
                })
        } else {
            res("command not found")
        }
    }
})
