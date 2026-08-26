import {SystemMenuQuickActions} from "../../../config/schema/definitions/systemMenuWidgets";
import {Accessor, createComputed, With} from "ags";
import AirplaneModeToggle from "./quickActions/AirplaneModeToggle";
import AppLauncherToggle from "./quickActions/AppLauncherToggle";
import BluetoothToggle from "./quickActions/BluetoothToggle";
import ClipboardManagerToggle from "./quickActions/ClipboardManagerToggle";
import ColorPicker from "./quickActions/ColorPicker";
import DoNotDisturb from "./quickActions/DoNotDisturb";
import Logout from "./quickActions/Logout";
import Lock from "./quickActions/Lock";
import NightlightToggle from "./quickActions/NightlightToggle";
import Restart from "./quickActions/Restart";
import ScreenshotToggle from "./quickActions/ScreenshotToggle";
import Shutdown from "./quickActions/Shutdown";
import {Gtk} from "ags/gtk4";

function getWidget(action: SystemMenuQuickActions) {
    switch (action) {
        case SystemMenuQuickActions.AIRPLANE_MODE_TOGGLE:
            return <AirplaneModeToggle/>
        case SystemMenuQuickActions.APP_LAUNCHER_TOGGLE:
            return <AppLauncherToggle/>
        case SystemMenuQuickActions.BLUETOOTH_TOGGLE:
            return <BluetoothToggle/>
        case SystemMenuQuickActions.CLIPBOARD_MANAGER_TOGGLE:
            return <ClipboardManagerToggle/>
        case SystemMenuQuickActions.COLOR_PICKER:
            return <ColorPicker/>
        case SystemMenuQuickActions.DO_NOT_DISTURB_TOGGLE:
            return <DoNotDisturb/>
        case SystemMenuQuickActions.LOGOUT:
            return <Logout/>
        case SystemMenuQuickActions.LOCK:
            return <Lock/>
        case SystemMenuQuickActions.NIGHTLIGHT_TOGGLE:
            return <NightlightToggle/>
        case SystemMenuQuickActions.RESTART:
            return <Restart/>
        case SystemMenuQuickActions.SCREENSHOT_TOGGLE:
            return <ScreenshotToggle/>
        case SystemMenuQuickActions.SHUTDOWN:
            return <Shutdown/>
    }
}

function chunkArray<T>(arr: T[], maxSize: number): T[][] {
    if (maxSize <= 0) {
        throw new Error("maxSize must be greater than 0");
    }

    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += maxSize) {
        result.push(arr.slice(i, i + maxSize));
    }
    return result;
}

export default function (
    {
        actions,
        maxSize,
    }: {
        actions: Accessor<SystemMenuQuickActions[]>
        maxSize: Accessor<number>,
    }
) {
    const values = createComputed([
        actions,
        maxSize
    ])
    return <box
        halign={Gtk.Align.CENTER}>
        <With value={values}>
            {values => {
                const actions = values[0]
                const size = values[1]
                const groups = chunkArray(actions, size)
                return <box
                    spacing={12}
                    halign={Gtk.Align.CENTER}
                    orientation={Gtk.Orientation.VERTICAL}>
                    {groups.map((group) => {
                        return <box
                            spacing={12}
                            halign={Gtk.Align.CENTER}
                            orientation={Gtk.Orientation.HORIZONTAL}>
                            {group.map((action) => {
                                return getWidget(action)
                            })}
                        </box>
                    })}
                </box> as Gtk.Box
            }}
        </With>
    </box>
}