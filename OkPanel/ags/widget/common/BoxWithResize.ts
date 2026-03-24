import GObject from "gi://GObject";
import Gtk from "gi://Gtk?version=4.0";

/** Layout manager that notifies when its widget's allocation changes */
const NotifyingBoxLayout = GObject.registerClass(
    { GTypeName: "NotifyingBoxLayout" },
    class NotifyingBoxLayout extends Gtk.BoxLayout {
        _w = -1;
        _h = -1;

        // Called during allocation
        vfunc_allocate(widget: Gtk.Widget, width: number, height: number, baseline: number) {
            // Do normal box allocation first
            super.vfunc_allocate(widget, width, height, baseline);

            if (width !== this._w || height !== this._h) {
                this._w = width;
                this._h = height;
                // Expect the widget to define a "resized" signal
                (widget as any).emit?.("resized", width, height);
            }
        }
    }
);

/** Box subclass that swaps in the notifying layout and exposes a "resized" signal */
export const BoxWithResize = GObject.registerClass(
    {
        GTypeName: "BoxWithResize",
        Signals: {
            resized: { param_types: [GObject.TYPE_INT, GObject.TYPE_INT] }, // (width, height)
        },
    },
    class BoxWithResize extends Gtk.Box {
        constructor(params: any = {}) {
            super(params);

            // Copy current box layout settings (orientation/spacing/homogeneous/baseline)
            const old = this.get_layout_manager() as Gtk.BoxLayout;
            const lm = new NotifyingBoxLayout();

            lm.set_orientation(old.get_orientation?.() ?? this.orientation);
            lm.set_spacing?.(old.get_spacing?.() ?? 0);
            lm.set_homogeneous?.(old.get_homogeneous?.() ?? false);
            lm.set_baseline_position?.(old.get_baseline_position?.() ?? Gtk.BaselinePosition.CENTER);

            this.set_layout_manager(lm);
        }
    }
);