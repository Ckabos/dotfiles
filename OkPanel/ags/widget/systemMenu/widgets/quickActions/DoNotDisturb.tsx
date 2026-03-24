import OkButton, {OkButtonSize} from "../../../common/OkButton";
import {createBinding} from "ags";
import AstalNotifd from "gi://AstalNotifd?version=0.1";

export default function () {
    const notifications = AstalNotifd.get_default()

    return <OkButton
        size={OkButtonSize.XL}
        label={createBinding(notifications, "dontDisturb").as((dnd) => {
            return dnd ? "󰂛" : "󰂚"
        })}
        offset={createBinding(notifications, "dontDisturb").as((dnd) => {
            return dnd ? 3 : 1
        })}
        selected={createBinding(notifications, "dontDisturb")}
        onClicked={() => {
            notifications.set_dont_disturb(!notifications.dontDisturb)
        }}/>
}