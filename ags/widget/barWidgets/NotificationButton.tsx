import {Bar} from "../../config/bar";
import AstalNotifd from "gi://AstalNotifd?version=0.1";
import {createBinding, createComputed} from "ags";
import {Gtk} from "ags/gtk4";
import OkButton from "../common/OkButton";
import {getHPadding, getVPadding} from "./BarWidgets";
import {toggleIntegratedNotificationHistory} from "../notification/IntegratedNotificationHistory";

export default function ({ bar}: { bar: Bar }) {
    const notifications = AstalNotifd.get_default()

    const notificationIcon = createComputed([
        createBinding(notifications, "dontDisturb")
    ], (doNotDisturb) => {
        if (doNotDisturb) {
            return "󰂛"
        } else{
            return "󰂚"
        }
    })

    const notificationIconOffset = createComputed([
        createBinding(notifications, "dontDisturb")
    ], (doNotDisturb) => {
        if (doNotDisturb) {
            return 2
        } else{
            return 1
        }
    })

    const visible = createComputed([
        createBinding(notifications, "notifications")
    ], (notificationsList) => {
        return notificationsList.length > 0
    })

    return <overlay
        $={(self) => {
            self.add_overlay(
                <box
                    canTarget={false}
                    canFocus={false}
                    hexpand={false}
                    vexpand={false}
                    visible={visible}
                    cssClasses={["notificationIndicator"]}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.CENTER}
                    widthRequest={7}
                    heightRequest={7}
                    marginStart={6}
                    marginBottom={6}
                /> as Gtk.Box
            )
        }}>
        <OkButton
            labelCss={["barNotificationHistoryForeground"]}
            backgroundCss={["barNotificationHistoryBackground"]}
            offset={notificationIconOffset}
            hpadding={getHPadding(bar)}
            vpadding={getVPadding(bar)}
            label={notificationIcon}
            onClicked={() => {
                toggleIntegratedNotificationHistory()
            }}/>
    </overlay>
}