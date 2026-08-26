import {addWidgets} from "../../barWidgets/BarWidgets";
import {variableConfig} from "../../../config/config";
import {Gtk} from "ags/gtk4";
import {createState, With} from "ags"
import {Bar} from "../../../config/bar";
import {BoxWithResize} from "../../common/BoxWithResize";

export const [leftBarWidth, leftBarWidthSetter] = createState(0)

export default function () {
    // wrapped in a box for the padding (margins of the center box)
    return <BoxWithResize
        $={(self) => {
            self.connect("resized", (_, w, h) => {
                leftBarWidthSetter(w)
            })
        }}>
        <centerbox
            hexpand={false}
            orientation={Gtk.Orientation.VERTICAL}
            startWidget={
                <box
                    visible={variableConfig.leftBar.topWidgets.asAccessor().as((widgets) =>
                        widgets.length > 0
                    )}
                    orientation={Gtk.Orientation.VERTICAL}>
                    <With value={variableConfig.leftBar.topWidgets.asAccessor()}>
                        {widgets => <box
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={variableConfig.leftBar.widgetSpacing.asAccessor()}>
                            {addWidgets(widgets, Bar.LEFT)}
                        </box>}
                    </With>
                </box> as Gtk.Widget
            }
            centerWidget={
                <box
                    visible={variableConfig.leftBar.centerWidgets.asAccessor().as((widgets) =>
                        widgets.length > 0
                    )}
                    orientation={Gtk.Orientation.VERTICAL}>
                    <With value={variableConfig.leftBar.centerWidgets.asAccessor()}>
                        {widgets => <box
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={variableConfig.leftBar.widgetSpacing.asAccessor()}>
                            {addWidgets(widgets, Bar.LEFT)}
                        </box>}
                    </With>
                </box> as Gtk.Widget
            }
            endWidget={
                <box
                    visible={variableConfig.leftBar.bottomWidgets.asAccessor().as((widgets) =>
                        widgets.length > 0
                    )}
                    orientation={Gtk.Orientation.VERTICAL}
                    valign={Gtk.Align.END}>
                    <With value={variableConfig.leftBar.bottomWidgets.asAccessor()}>
                        {widgets => <box
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={variableConfig.leftBar.widgetSpacing.asAccessor()}>
                            {addWidgets(widgets, Bar.LEFT)}
                        </box>}
                    </With>
                </box> as Gtk.Widget
            }/>
    </BoxWithResize>
}
