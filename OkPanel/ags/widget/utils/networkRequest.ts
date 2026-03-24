import Gio from "gi://Gio?version=2.0";
import Soup from "gi://Soup?version=3.0";
import GLib from "gi://GLib?version=2.0";

Gio._promisify(Soup.Session.prototype, 'send_and_read_async', 'send_and_read_finish');

const session = new Soup.Session();

export async function fetchJson(url: string) {
    const msg = Soup.Message.new('GET', url);
    const bytes = await session.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, null);
    const byteArray = bytes.get_data()!
    const text = new TextDecoder('utf-8').decode(byteArray);
    return JSON.parse(text);
}