import OkButton, {OkButtonSize} from "../../../common/OkButton";
import {runColorPicker} from "../../../utils/colorPicker";

export default function () {
    return <OkButton
        size={OkButtonSize.XL}
        label=""
        offset={2}
        onClicked={() => {
            runColorPicker(500).catch((error) => console.log(error))
        }}/>
}