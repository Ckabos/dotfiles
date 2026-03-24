import { Gtk } from "ags/gtk4";
import Cairo from 'gi://cairo';
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import { variableConfig } from "../../config/config";
import { isAccessor } from "../utils/bindings";
import { timeout } from "ags/time"
import { hexToRgba } from "../utils/strings";
import { Accessor, createComputed, createState, onCleanup, With } from "ags";

// =====================================================================
// CUSTOM CAVA ENGINE (Bypass AstalCava crash)
// =====================================================================
class CustomCava {
    public values: number[] = [];
    public bars: number;
    private proc: Gio.Subprocess | null = null;
    private stream: Gio.DataInputStream | null = null;
    private subscribers: (() => void)[] = [];

    constructor(bars: number) {
        this.bars = bars;
        this.start();
    }

    public set_active(active: boolean) {
        if (!active && this.proc) {
            try { this.proc.force_exit(); } catch(e){}
        }
    }

    public subscribe(callback: () => void) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(c => c !== callback);
        };
    }

    private notify() {
        this.subscribers.forEach(cb => cb());
    }

    private start() {
        try {
            // Generamos una configuración temporal infalible y lanzamos Cava en modo 'raw'
            const conf = `[general]\\nbars=${this.bars}\\nframerate=60\\nlower_cutoff_freq=50\\nhigher_cutoff_freq=10000\\n[input]\\nmethod=pulse\\nsource=auto\\n[output]\\nmethod=raw\\nraw_target=/dev/stdout\\ndata_format=ascii\\nascii_max_range=1000`;
            
            this.proc = Gio.Subprocess.new(
                ["bash", "-c", `echo -e "${conf}" > /tmp/ok_cava.conf && cava -p /tmp/ok_cava.conf`],
                Gio.SubprocessFlags.STDOUT_PIPE
            );

            this.stream = new Gio.DataInputStream({
                base_stream: this.proc.get_stdout_pipe(),
                close_base_stream: true
            });

            const readLoop = () => {
                if (!this.stream) return;
                this.stream.read_line_async(0, null, (s, res) => {
                    try {
                        const [line] = (s as Gio.DataInputStream).read_line_finish_utf8(res);
                        if (line) {
                            // Cava nos envía valores separados por punto y coma (ej. 10;500;800)
                            const parsed = line.split(';').map(n => parseInt(n)).filter(n => !isNaN(n));
                            if (parsed.length > 0) {
                                // Normalizamos a rango 0.0 - 1.0
                                this.values = parsed.map(v => v / 1000);
                                this.notify();
                            }
                        }
                        readLoop();
                    } catch (e) {}
                });
            };
            readLoop();
        } catch (e) {
            console.error("Custom Cava engine falló al iniciar:", e);
        }
    }
}

// =====================================================================
// FUNCIONES GRÁFICAS Y UI
// =====================================================================

function getCoordinate(value: number, size: number, flipStart: boolean, intensity: number) {
    const magicSize = size * intensity;
    if (flipStart) return Math.min(size, (value * magicSize) - 1);
    return Math.max(0, size - (value * magicSize) + 1);
}

function moveTo(cr: Cairo.Context, vertical: boolean, length: number, size: number) {
    if (vertical) { /* @ts-ignore */ cr.moveTo(size, length) }
    else { /* @ts-ignore */ cr.moveTo(length, size) }
}

function lineTo(cr: Cairo.Context, vertical: boolean, length: number, size: number) {
    if (vertical) { /* @ts-ignore */ cr.lineTo(size, length) }
    else { /* @ts-ignore */ cr.lineTo(length, size) }
}

function setBars(cava: CustomCava, length: number) {
    const barCount = Math.floor(Math.min(200, Math.max(1, length / 10)));
    if (cava.bars !== barCount) {
        cava.bars = barCount;
    }
}

type Params = {
    vertical?: boolean,
    flipStart: Accessor<boolean>,
    length?: number | Accessor<number>,
    size?: number,
    expand?: boolean | Accessor<boolean>,
    intensity?: number | Accessor<number>,
    marginTop?: number,
    marginBottom?: number,
    marginStart?: number,
    marginEnd?: number,
    color?: Accessor<string>,
}

export default function(
    {
        vertical = false,
        flipStart,
        length = 0,
        size = 0,
        expand = false,
        intensity = 1,
        marginTop,
        marginBottom,
        marginStart,
        marginEnd,
        color = variableConfig.theme.colors.primary.asAccessor(),
    }: Params
) {
    const parameters = createComputed([
        typeof length === 'number' ? createState(length)[0] : length,
        typeof expand === 'boolean' ? createState(expand)[0] : expand,
        typeof intensity === 'number' ? createState(intensity)[0] : intensity,
    ])
    return <box vexpand={!vertical} hexpand={vertical}>
        <With value={flipStart}>
            {(flip) => (vertical && !flip) ? <box hexpand={true}/> : <box/>}
        </With>
        <With value={parameters}>
            {([length, expand, intensity]) => (
                <CavaWaveformInternal
                    vertical={vertical}
                    flipStart={flipStart}
                    length={length}
                    size={size}
                    expand={expand}
                    intensity={intensity}
                    marginTop={marginTop}
                    marginBottom={marginBottom}
                    marginStart={marginStart}
                    marginEnd={marginEnd}
                    color={color}/>
            )}
        </With>
    </box>
}

type InternalParams = {
    vertical?: boolean,
    flipStart: Accessor<boolean>,
    length?: number,
    size?: number,
    expand?: boolean,
    intensity?: number,
    marginTop?: number,
    marginBottom?: number,
    marginStart?: number,
    marginEnd?: number,
    color: Accessor<string>
}

function CavaWaveformInternal(
    {
        vertical = false,
        flipStart,
        length = 0,
        size = 0,
        expand = false,
        intensity = 1,
        marginTop,
        marginBottom,
        marginStart,
        marginEnd,
        color,
    }: InternalParams
) {
    // Instanciamos nuestro motor propio. Adiós AstalCava.
    const barCount = Math.max(1, Math.floor(length / 10)) || 30;
    const cava = new CustomCava(barCount);

    onCleanup(() => {
        cava.set_active(false);
    })

    let [r, g, b, a] = hexToRgba(color.get());
    const unsub = color.subscribe(() => { [r, g, b, a] = hexToRgba(color.get()) });
    onCleanup(unsub);

    const drawing = new Gtk.DrawingArea({
        hexpand: vertical ? false : expand,
        vexpand: vertical ? expand : false,
        height_request: vertical ? length : size,
        width_request: vertical ? size : length,
    });

    drawing.set_draw_func((area, cr, drawWidth, drawHeight) => {
        const drawLength = vertical ? drawHeight : drawWidth;
        const drawSize = vertical ? drawWidth : drawHeight;
        let flip: boolean = isAccessor(flipStart) ? flipStart.get() : (flipStart as any);

        /* @ts-ignore */ cr.setSourceRGBA(r, g, b, a);
        /* @ts-ignore */ cr.setLineWidth(2);

        let x = 0;
        const values = cava.values || [];
        if (values.length === 0) return;

        const spacing = drawLength / (values.length * 2 + 1);

        values.reverse();
        moveTo(cr, vertical, x, flip ? -1 : drawSize + 1);

        values.forEach((value: number) => {
            x = x + spacing;
            lineTo(cr, vertical, x, getCoordinate(value, drawSize, flip, intensity));
        });

        values.reverse();
        values.forEach((value: number) => {
            x = x + spacing;
            lineTo(cr, vertical, x, getCoordinate(value, drawSize, flip, intensity));
        });

        lineTo(cr, vertical, drawLength, flip ? -1 : drawSize + 1);
        /* @ts-ignore */ cr.stroke();
    });

    let unsubscribe: (() => void) | null = null;

    drawing.connect("map", () => {
        timeout(2000, () => {
            const drawLength = vertical ? drawing.get_height() : drawing.get_width();
            if (drawLength > 0) setBars(cava, drawLength);
        });

        unsubscribe = cava.subscribe(() => {
            drawing.queue_draw();
        });
    });

    drawing.connect("unmap", () => {
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    });

    return <box
        marginTop={marginTop} marginBottom={marginBottom}
        marginStart={marginStart} marginEnd={marginEnd}
        vexpand={vertical ? expand : false} hexpand={vertical ? false : expand}
        widthRequest={vertical ? size : length} heightRequest={vertical ? length : size}>
        {drawing}
    </box>
}
