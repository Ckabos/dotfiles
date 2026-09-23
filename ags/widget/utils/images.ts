import GdkPixbuf from "gi://GdkPixbuf?version=2.0";
import {Gdk} from "ags/gtk4";
import Gio from "gi://Gio?version=2.0";
import {timeout} from "ags/time";

function loadPixbuf(path: string): Promise<GdkPixbuf.Pixbuf> {
    const stream = Gio.File.new_for_path(path).read(null);
    return new Promise((resolve, reject) => {
        GdkPixbuf.Pixbuf.new_from_stream_async(stream, null, (obj, res) => {
            try {
                resolve(GdkPixbuf.Pixbuf.new_from_stream_finish(res));
            } catch (e) {
                reject(e);
            }
        });
    });
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => timeout(ms, resolve));
}

/**
 * Creates a scaled texture at the desired width and height, cropping out extra content if the aspect
 * ratio of the image is different from the aspect ratio of the desired width/height
 * @param width desired width
 * @param height desired height
 * @param path full path to the file
 */
export async function createScaledTexture(width: number, height: number, path: string) {
    if (width === 0 || height === 0) return null

    let pixbuf: GdkPixbuf.Pixbuf;
    try {
        pixbuf = await loadPixbuf(path);
    } catch (e) {
        // Hiccup transitorio de GIO/portal (p.ej. GdkPixbuf.PixbufError: zbus
        // variant error) leyendo un archivo local normal: un reintento basta.
        try {
            await delay(200);
            pixbuf = await loadPixbuf(path);
        } catch (e2) {
            logError(e2);
            return null;
        }
    }

    const originalWidth = pixbuf.get_width();
    const originalHeight = pixbuf.get_height();

    const scaleFactor = Math.max(width / originalWidth, height / originalHeight);
    const newWidth = Math.ceil(originalWidth * scaleFactor);
    const newHeight = Math.ceil(originalHeight * scaleFactor);

    const scaled = pixbuf.scale_simple(newWidth, newHeight, GdkPixbuf.InterpType.BILINEAR)!;

    const xOffset = Math.floor((newWidth - width) / 2);
    const yOffset = Math.floor((newHeight - height) / 2);
    const cropped = scaled.new_subpixbuf(xOffset, yOffset, width, height);

    return Gdk.Texture.new_for_pixbuf(cropped);
}