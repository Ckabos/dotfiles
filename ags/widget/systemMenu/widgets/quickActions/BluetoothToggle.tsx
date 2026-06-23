import OkButton, {OkButtonSize} from "../../../common/OkButton";
import {createBinding} from "ags";
import AstalBluetooth from "gi://AstalBluetooth?version=0.1";

export default function () {
    const bluetooth = AstalBluetooth.get_default()

    return <OkButton
        size={OkButtonSize.XL}
        label={createBinding(bluetooth, "isPowered").as((powered) =>
            powered ? "󰂯" : "󰂲"
        )}
        offset={0}
        selected={createBinding(bluetooth, "isPowered")}
        onClicked={() => {
            bluetooth.toggle()
        }}/>
}