import {Gtk} from "ags/gtk4"
import {addWidgets} from "../../barWidgets/BarWidgets";
import {variableConfig} from "../../../config/config";
import {createState, With} from "ags";
import {Bar} from "../../../config/bar";
import {BoxWithResize} from "../../common/BoxWithResize";

export const [bottomBarHeight, bottomBarHeightSetter] = createState(0)

export default function () {

    // wrapped in a box for the padding (margins of the center box)
    return <BoxWithResize
        $={(self) => {
            self.connect("resized", (_, w, h) => {
                bottomBarHeightSetter(h)
            })
            self.set_overflow(Gtk.Overflow.HIDDEN)
        }}
        widthRequest={variableConfig.bottomBar.minimumWidth.asAccessor()}
        marginTop={variableConfig.bottomBar.marginTop.asAccessor()}
        marginBottom={variableConfig.bottomBar.marginBottom.asAccessor()}
        marginStart={variableConfig.bottomBar.marginStart.asAccessor()}
        marginEnd={variableConfig.bottomBar.marginEnd.asAccessor()}
        cssClasses={["bottomBar"]}>
        <centerbox
            marginTop={variableConfig.bottomBar.paddingTop.asAccessor()}
            marginBottom={variableConfig.bottomBar.paddingBottom.asAccessor()}
            marginStart={variableConfig.bottomBar.paddingStart.asAccessor()}
            marginEnd={variableConfig.bottomBar.paddingEnd.asAccessor()}
            hexpand={true}
            orientation={Gtk.Orientation.HORIZONTAL}
            startWidget={
                <box
                    visible={variableConfig.bottomBar.leftWidgets.asAccessor().as((widgets) =>
                        widgets.length > 0
                    )}
                    halign={Gtk.Align.START}>
                    <With value={variableConfig.bottomBar.leftWidgets.asAccessor()}>
                        {widgets => <box
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={variableConfig.bottomBar.widgetSpacing.asAccessor()}>
                            {addWidgets(widgets, Bar.BOTTOM)}
                        </box>}
                    </With>
                </box> as Gtk.Widget
            }
            centerWidget={
                <box
                    visible={variableConfig.bottomBar.centerWidgets.asAccessor().as((widgets) =>
                        widgets.length > 0
                    )}>
                    <With value={variableConfig.bottomBar.centerWidgets.asAccessor()}>
                        {widgets => <box
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={variableConfig.bottomBar.widgetSpacing.asAccessor()}>
                            {addWidgets(widgets, Bar.BOTTOM)}
                        </box>}
                    </With>
                </box> as Gtk.Widget
            }
            endWidget={
                <box
                    visible={variableConfig.bottomBar.rightWidgets.asAccessor().as((widgets) =>
                        widgets.length > 0
                    )}
                    halign={Gtk.Align.END}>
                    <With value={variableConfig.bottomBar.rightWidgets.asAccessor()}>
                        {widgets => <box
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={variableConfig.bottomBar.widgetSpacing.asAccessor()}>
                            {addWidgets(widgets, Bar.BOTTOM)}
                        </box>}
                    </With>
                </box> as Gtk.Widget
            }/>
    </BoxWithResize>
}
