import Gio from "gi://Gio?version=2.0";

export function listFilenamesInDir(path: string): string[] {
    const dir = Gio.File.new_for_path(path);

    if (!dir.query_exists(null)) {
        return [];
    }

    const enumerator = dir.enumerate_children(
        Gio.FILE_ATTRIBUTE_STANDARD_NAME,
        Gio.FileQueryInfoFlags.NONE,
        null
    );

    const filenames: string[] = [];
    let info: Gio.FileInfo | null;

    while ((info = enumerator.next_file(null)) !== null) {
        filenames.push(info.get_name());
    }

    enumerator.close(null);
    filenames.sort()
    return filenames;
}