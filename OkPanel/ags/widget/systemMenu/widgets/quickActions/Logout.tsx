import OkButton, {OkButtonSize} from "../../../common/OkButton";
import {logout} from "../../../utils/powerOptions";

export default function () {
    return <OkButton
        size={OkButtonSize.XL}
        label="󰍃"
        offset={0}
        onClicked={() => {
            logout()
        }}/>
}