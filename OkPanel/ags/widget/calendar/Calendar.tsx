import {Gtk} from "ags/gtk4"
import GLib from "gi://GLib?version=2.0";
import {createPoll} from "ags/time";

export default function () {
    const time = createPoll<GLib.DateTime>(
        GLib.DateTime.new_now_local(),
        1000,
        () => GLib.DateTime.new_now_local()
    )

    return <box
        cssClasses={["calendarBox"]}
        orientation={Gtk.Orientation.VERTICAL}>
        <label
            cssClasses={["labelXLBold"]}
            label={time.as((t) => {
                return t.format("%A")!
            })}/>
        <label
            cssClasses={["labelXLBold"]}
            label={time.as((t) => {
                return t.format("%B %-d, %Y")!
            })}/>
        <Gtk.Calendar
            widthRequest={340}
            canFocus={false}
            focusOnClick={false}
            marginTop={12}
            cssClasses={["calendar"]}/>
    </box>
}