import { Gtk } from "ags/gtk4";
import {WallpaperTransitionType} from "../../config/schema/definitions/wallpaper";

export function toGtkTransition(t: WallpaperTransitionType): Gtk.StackTransitionType {
    switch (t) {
        case WallpaperTransitionType.None: return Gtk.StackTransitionType.NONE;
        case WallpaperTransitionType.Crossfade: return Gtk.StackTransitionType.CROSSFADE;
        case WallpaperTransitionType.SlideRight: return Gtk.StackTransitionType.SLIDE_RIGHT;
        case WallpaperTransitionType.SlideLeft: return Gtk.StackTransitionType.SLIDE_LEFT;
        case WallpaperTransitionType.SlideUp: return Gtk.StackTransitionType.SLIDE_UP;
        case WallpaperTransitionType.SlideDown: return Gtk.StackTransitionType.SLIDE_DOWN;
        case WallpaperTransitionType.SlideLeftRight: return Gtk.StackTransitionType.SLIDE_LEFT_RIGHT;
        case WallpaperTransitionType.SlideUpDown: return Gtk.StackTransitionType.SLIDE_UP_DOWN;
        case WallpaperTransitionType.OverUp: return Gtk.StackTransitionType.OVER_UP;
        case WallpaperTransitionType.OverDown: return Gtk.StackTransitionType.OVER_DOWN;
        case WallpaperTransitionType.OverLeft: return Gtk.StackTransitionType.OVER_LEFT;
        case WallpaperTransitionType.OverRight: return Gtk.StackTransitionType.OVER_RIGHT;
        case WallpaperTransitionType.UnderUp: return Gtk.StackTransitionType.UNDER_UP;
        case WallpaperTransitionType.UnderDown: return Gtk.StackTransitionType.UNDER_DOWN;
        case WallpaperTransitionType.UnderLeft: return Gtk.StackTransitionType.UNDER_LEFT;
        case WallpaperTransitionType.UnderRight: return Gtk.StackTransitionType.UNDER_RIGHT;
        case WallpaperTransitionType.OverUpDown: return Gtk.StackTransitionType.OVER_UP_DOWN;
        case WallpaperTransitionType.OverDownUp: return Gtk.StackTransitionType.OVER_DOWN_UP;
        case WallpaperTransitionType.OverLeftRight: return Gtk.StackTransitionType.OVER_LEFT_RIGHT;
        case WallpaperTransitionType.OverRightLeft: return Gtk.StackTransitionType.OVER_RIGHT_LEFT;
        case WallpaperTransitionType.RotateLeft: return Gtk.StackTransitionType.ROTATE_LEFT;
        case WallpaperTransitionType.RotateRight: return Gtk.StackTransitionType.ROTATE_RIGHT;
        case WallpaperTransitionType.RotateLeftRight: return Gtk.StackTransitionType.ROTATE_LEFT_RIGHT;
        default: return Gtk.StackTransitionType.NONE;
    }
}