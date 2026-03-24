import {Gtk} from "ags/gtk4"
import {addWidgets} from "../../barWidgets/BarWidgets";
import {variableConfig} from "../../../config/config";
import {createState, With} from "ags";
import {Bar} from "../../../config/bar";
import {BoxWithResize} from "../../common/BoxWithResize";
import SwapWorkspaceButton from "../../barWidgets/SwapWorkspaceButton";

export const [topBarHeight, topBarHeightSetter] = createState(0)

export default function TopBar({ monitor }: { monitor: number } = { monitor: 0 }) {

    // wrapped in a box for the padding (margins of the center box)
    return <BoxWithResize
        $={(self) => {
            self.connect("resized", (_, w, h) => {
                topBarHeightSetter(h)
            })
            self.set_overflow(Gtk.Overflow.HIDDEN)
        }}
        widthRequest={variableConfig.topBar.minimumWidth.asAccessor()}
        marginTop={variableConfig.topBar.marginTop.asAccessor()}
        marginBottom={variableConfig.topBar.marginBottom.asAccessor()}
        marginStart={variableConfig.topBar.marginStart.asAccessor()}
        marginEnd={variableConfig.topBar.marginEnd.asAccessor()}
        cssClasses={["topBar"]}>
        <centerbox
            marginTop={variableConfig.topBar.paddingTop.asAccessor()}
            marginBottom={variableConfig.topBar.paddingBottom.asAccessor()}
            marginStart={variableConfig.topBar.paddingStart.asAccessor()}
            marginEnd={variableConfig.topBar.paddingEnd.asAccessor()}
            hexpand={true}
            orientation={Gtk.Orientation.HORIZONTAL}
            startWidget={
                <box
                    visible={variableConfig.topBar.leftWidgets.asAccessor().as((widgets) =>
                        widgets.length > 0
                    )}
                    halign={Gtk.Align.START}>
                    <With value={variableConfig.topBar.leftWidgets.asAccessor()}>
                        {widgets => <box
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={variableConfig.topBar.widgetSpacing.asAccessor()}>
                            {addWidgets(widgets, Bar.TOP)} 
                        </box>}
                    </With>
                </box> as Gtk.Widget
            }
            centerWidget={
                <box
                    visible={variableConfig.topBar.centerWidgets.asAccessor().as((widgets) =>
                        widgets.length > 0
                    )}>
                    <With value={variableConfig.topBar.centerWidgets.asAccessor()}>
                        {widgets => <box
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={variableConfig.topBar.widgetSpacing.asAccessor()}>
                            {addWidgets(widgets, Bar.TOP)}
                        </box>}
                    </With>
                </box> as Gtk.Widget
            }
            endWidget={
                <box
                    halign={Gtk.Align.END}>
                    <With value={variableConfig.topBar.rightWidgets.asAccessor()}>
                        {widgets => <box
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={variableConfig.topBar.widgetSpacing.asAccessor()}>
                            {addWidgets(widgets, Bar.TOP)}
                            <SwapWorkspaceButton />
                        </box>}
                    </With>
                </box> as Gtk.Widget
            }/>
    </BoxWithResize>
}
