import Gtk from "gi://Gtk?version=4.0";
import Gdk from "gi://Gdk?version=4.0";

export function attachClickHandlers(widget: Gtk.Widget, handlers: {
    onLeftClick?:    (ev: {self:Gtk.Widget,x:number,y:number,n:number,shift:boolean,ctrl:boolean}) => void,
    onMiddleClick?:  (ev: {self:Gtk.Widget,x:number,y:number,n:number,shift:boolean,ctrl:boolean}) => void,
    onRightClick?:   (ev: {self:Gtk.Widget,x:number,y:number,n:number,shift:boolean,ctrl:boolean}) => void,
    onDoubleLeft?:   (ev: {self:Gtk.Widget,x:number,y:number}) => void,
    onLongPress?:    (ev: {self:Gtk.Widget,x:number,y:number}) => void,
} = {}) {
    // Clicks (left/middle/right, single/double)
    const click = new Gtk.GestureClick();
    const self = widget
    click.set_button(0); // 0 = listen to all mouse buttons

    click.connect("pressed", (_gesture, n_press, x, y) => {
        const button = click.get_current_button();
        const [shift, ctrl] = getModifiers(click);

        if (button === 1) {
            if (n_press === 2 && handlers.onDoubleLeft) {
                handlers.onDoubleLeft({ self, x, y });
            } else if (handlers.onLeftClick) {
                handlers.onLeftClick({ self, x, y, n: n_press, shift, ctrl });
            }
        } else if (button === 2 && handlers.onMiddleClick) {
            handlers.onMiddleClick({ self, x, y, n: n_press, shift, ctrl });
        } else if (button === 3 && handlers.onRightClick) {
            handlers.onRightClick({ self, x, y, n: n_press, shift, ctrl });
        }
    });

    // Optional: long-press (good for touch to open context menu)
    const longPress = new Gtk.GestureLongPress();
    longPress.connect("pressed", (_gesture, x, y) => {
        handlers.onLongPress?.({ self, x, y });
    });

    widget.add_controller(click);
    widget.add_controller(longPress);
}

function getModifiers(gesture: Gtk.Gesture): [boolean, boolean] {
    const state = (gesture as any).get_current_event_state?.() as Gdk.ModifierType | undefined;
    const shift = !!(state && (state & Gdk.ModifierType.SHIFT_MASK));
    const ctrl  = !!(state && (state & Gdk.ModifierType.CONTROL_MASK));
    return [shift, ctrl];
}
