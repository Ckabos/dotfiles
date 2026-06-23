import OkButton, {OkButtonSize} from "../../../common/OkButton";
import {lock} from "../../../utils/powerOptions";

export default function () {
    return <OkButton
        size={OkButtonSize.XL}
        label=""
        offset={2}
        onClicked={() => {
            lock()
        }}/>
}