import {Gtk} from "ags/gtk4";
import {Accessor} from "ags";

export default function (
    {
        icon,
        label,
        onClicked,
        sensitive,
    } : {
        icon: string,
        label: string,
        onClicked: () => void,
        sensitive?: Accessor<boolean>,
    }
) {
    return <button
        sensitive={sensitive}
        widthRequest={115}
        cssClasses={["screenshotButton"]}
        onClicked={onClicked}>
        <box
            orientation={Gtk.Orientation.VERTICAL}>
            <label
                cssClasses={["screenShotLabel"]}
                label={icon}/>
            <label
                label={label}/>
        </box>
    </button>
}