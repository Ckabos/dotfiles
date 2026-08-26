import {Gtk} from "ags/gtk4"
import Pango from "gi://Pango?version=1.0";
import {
    availableConfigs, ConfigFile,
    selectedConfig,
    setNewConfig,
    variableConfig
} from "../../../config/config";
import RevealerRow from "../../common/RevealerRow";
import OkButton, {OkButtonSize} from "../../common/OkButton";
import {For, onCleanup, With} from "ags";
import GLib from "gi://GLib?version=2.0";
import {integratedMenuRevealed} from "../IntegratedMenu";

let buttonsEnabled = true

function updateConfig(configFile: ConfigFile) {
    if (!buttonsEnabled) {
        return
    }
    buttonsEnabled = false
    setNewConfig(configFile, () => {
        buttonsEnabled = true
    })
}

function updateFade(
    adjustment: Gtk.Adjustment,
    leftGradient: Gtk.Box,
    rightGradient: Gtk.Box,
) {
    let leftDistance = adjustment.get_value() * 2
    if (leftDistance > 100) {
        leftDistance = 100
    }
    leftGradient.opacity = leftDistance / 100

    const maxScroll = adjustment.get_upper() - adjustment.get_page_size();
    let rightDistance = (maxScroll - adjustment.get_value()) * 2
    if (rightDistance > 100) {
        rightDistance = 100
    }
    rightGradient.opacity = rightDistance / 100
}

let scrollAnimationId: number | null = null

function animateScroll(
    adjustment: Gtk.Adjustment,
    targetValue: number,
    leftGradient: Gtk.Box,
    rightGradient: Gtk.Box,
    duration = 150
) {
    // Cancel any previous animation
    if (scrollAnimationId !== null) {
        GLib.source_remove(scrollAnimationId);
        scrollAnimationId = null;
    }

    const start = adjustment.get_value();
    const delta = targetValue - start;
    const startTime = GLib.get_monotonic_time();

    scrollAnimationId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000 / 60, () => {
        const now = GLib.get_monotonic_time();
        const elapsed = (now - startTime) / 1000; // microseconds → milliseconds

        const progress = Math.min(elapsed / duration, 1);
        const eased = progress * (2 - progress); // easeOutQuad

        adjustment.set_value(start + delta * eased);

        updateFade(adjustment, leftGradient, rightGradient);

        if (progress < 1) {
            return GLib.SOURCE_CONTINUE;
        } else {
            scrollAnimationId = null;
            return GLib.SOURCE_REMOVE;
        }
    });
}

function ThemeButton({configFile}: {configFile: ConfigFile}) {
    // Nombre legible para el tooltip: usa theme.name; si está vacío, el archivo.
    const tooltip = (configFile.name && configFile.name.trim().length > 0)
        ? configFile.name
        : configFile.fileName.replace(/\.yaml$/, "")
    return <OkButton
        size={OkButtonSize.XL}
        label={configFile.icon}
        offset={configFile.pixelOffset}
        tooltipText={tooltip}
        selected={selectedConfig.asAccessor()((t) => t === configFile)}
        onClicked={() => {
            updateConfig(configFile)
        }}/>
}

function ThemeOptions() {
    let leftGradient: Gtk.Box
    let rightGradient: Gtk.Box
    const scrolledWindow = new Gtk.ScrolledWindow({
        hexpand: true,
        cssClasses: ["scrollWindow"],
        hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
        vscrollbar_policy: Gtk.PolicyType.NEVER,
        heightRequest: 50,
        child: <box
            marginStart={22}
            marginEnd={22}
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={10}>
            <For each={availableConfigs.asAccessor()} id={(it) => it.fileName}>
                {(config) => {
                    return <ThemeButton configFile={config}/>
                }}
            </For>
        </box> as Gtk.Widget
    })

    const scrollController = Gtk.EventControllerScroll.new(Gtk.EventControllerScrollFlags.BOTH_AXES)

    // Intercept vertical scrolling and translate to horizontal
    scrollController.connect('scroll', (controller, dx, dy) => {
        if (dy !== 0) {
            const hadj = scrolledWindow.get_hadjustment()
            const maxScroll = hadj.get_upper() - hadj.get_page_size();
            if (dy === 1 || dy === -1) {
                const newValue = hadj.get_value() + dy * 50;
                animateScroll(
                    hadj,
                    Math.max(0, Math.min(newValue, maxScroll)),
                    leftGradient,
                    rightGradient,
                );
            } else {
                const newValue = hadj.get_value() + dy * 5;
                hadj.set_value(newValue);
                updateFade(hadj, leftGradient, rightGradient);
            }
            return true
        }
        if (dx !== 0) {
            const hadj = scrolledWindow.get_hadjustment()
            const maxScroll = hadj.get_upper() - hadj.get_page_size();
            if (dx === 1 || dx === -1) {
                const newValue = hadj.get_value() + dx * 30;
                animateScroll(
                    hadj,
                    Math.max(0, Math.min(newValue, maxScroll)),
                    leftGradient,
                    rightGradient,
                );
            } else {
                const newValue = hadj.get_value() + dx * 5;
                hadj.set_value(newValue);
                updateFade(hadj, leftGradient, rightGradient);
            }
            return true

        }
        return false
    })

    scrolledWindow.add_controller(scrollController);

    const overlay = new Gtk.Overlay(
        {
            child: scrolledWindow
        }
    )

    overlay.add_overlay(
        <box
            canTarget={false}
            canFocus={false}
            opacity={0}
            widthRequest={50}
            halign={Gtk.Align.START}
            hexpand={false}
            cssClasses={["fadeLeft"]}
            $={(self) => {
                leftGradient = self
            }}/> as Gtk.Widget
    )

    overlay.add_overlay(
        <box
            canTarget={false}
            canFocus={false}
            widthRequest={50}
            halign={Gtk.Align.END}
            hexpand={false}
            cssClasses={["fadeRight"]}
            $={(self) => {
                rightGradient = self
            }}/> as Gtk.Widget
    )

    return <box
        hexpand={true}
        orientation={Gtk.Orientation.HORIZONTAL}>
        {overlay}
    </box>
}

export default function () {
    return <RevealerRow
        setup={(revealed) => {
            const unsub = integratedMenuRevealed.subscribe(() => {
                if (!integratedMenuRevealed.get()) {
                    revealed[1](false)
                }
            })
            onCleanup(unsub)
        }}
        icon={variableConfig.icon.asAccessor()}
        iconOffset={variableConfig.iconOffset.asAccessor()}
        content={
            <label
                cssClasses={["labelMediumBold"]}
                halign={Gtk.Align.START}
                hexpand={true}
                ellipsize={Pango.EllipsizeMode.END}
                label={selectedConfig.asAccessor()((c) => {
                    if (!c) return "Apariencia"
                    const name = (c.name && c.name.trim().length > 0)
                        ? c.name
                        : c.fileName.replace(/\.yaml$/, "")
                    return `Apariencia: ${name}`
                })}/>
        }
        revealedContent={
            <box
                marginTop={10}
                orientation={Gtk.Orientation.VERTICAL}>
                <box>
                    <With value={availableConfigs.asAccessor()}>
                        {(availConfigs) => {
                            if (availConfigs.length > 1) {
                                return <ThemeOptions/>
                            } else {
                                return <box/>
                            }
                        }}
                    </With>
                </box>
            </box>
        }
    />
}
