import {Astal, Gtk} from "ags/gtk4";
import App from "ags/gtk4/app";
import {variableConfig} from "../../config/config";
import {createComputed, createState, onCleanup} from "ags";
import LeftBar from "./bars/LeftBar";
import IntegratedMenu from "../systemMenu/IntegratedMenu";
import TopBar from "./bars/TopBar";
import RightBar from "./bars/RightBar";
import BottomBar from "./bars/BottomBar";
import IntegratedCalendar from "../calendar/IntegratedCalendar";
import IntegratedClipboardManager, { integratedClipboardManagerRevealed } from "../clipboardManager/IntegratedClipboardManager";
import IntegratedEmojiMenu, { integratedEmojiMenuRevealed } from "../emojiManager/IntegratedEmojiMenu";
import IntegratedNotificationHistory from "../notification/IntegratedNotificationHistory";
import {appendChildren, ghostWhenTooNarrow, removeAllChildren} from "../utils/widgets";
import {Position} from "../../config/schema/definitions/frame";
import IntegratedScreenshot from "../screenshot/IntegratedScreenshot";
import IntegratedAppLauncher from "../appLauncher/IntegratedAppLauncher";
import IntegratedScreenshare from "../screenshare/IntegratedScreenshare";
import FrameDrawing from "./FrameDrawing";
import {BoxWithResize} from "../common/BoxWithResize";

export const frameWindowName = "frame"

export let frameWindow: Astal.Window

let leftGroup: Gtk.Box
let rightGroup: Gtk.Box
let integratedMenu: Gtk.Widget
let leftBar: Gtk.Widget
let rightBar: Gtk.Widget
let integratedCalendar: Gtk.Widget
let integratedClipboardManager: Gtk.Widget
let integratedEmojiMenu: Gtk.Widget
let integratedNotificationHistory: Gtk.Widget
let integratedScreenshotTool: Gtk.Widget
let integratedAppLauncher: Gtk.Widget
let integratedScreenshare: Gtk.Widget

export const [leftGroupWidth, leftGroupWidthSetter] = createState(0)
export const [rightGroupWidth, rightGroupWidthSetter] = createState(0)

// Estado para calcular el Keymode Dinámico de Hyprland
export const [currentKeymode, setCurrentKeymode] = createState<Astal.Keymode>(Astal.Keymode.ON_DEMAND)

function getLeftAndRightSides() {
    const menuPosition = variableConfig.frame.menu.position.asAccessor()
    const calendarPosition = variableConfig.frame.calendar.position.asAccessor()
    const clipboardManagerPosition = variableConfig.frame.clipboardManager.position.asAccessor()
    const emojiMenuPosition = variableConfig.frame.emojiMenu.position.asAccessor()
    const notificationHistoryPosition = variableConfig.frame.notifications.position.asAccessor()
    const screenshotPositon = variableConfig.frame.screenshotTool.position.asAccessor()
    const appLauncherPosition = variableConfig.frame.appLauncher.position.asAccessor()
    const screensharePosition = variableConfig.frame.screenshare.position.asAccessor()

    const leftSide = [leftBar]
    const rightSide = [rightBar]

    if (menuPosition.get() === Position.LEFT) {
        leftSide.push(integratedMenu)
    } else {
        rightSide.push(integratedMenu)
    }

    if (calendarPosition.get() === Position.LEFT) {
        leftSide.push(integratedCalendar)
    } else {
        rightSide.push(integratedCalendar)
    }

    if (clipboardManagerPosition.get() === Position.LEFT) {
        leftSide.push(integratedClipboardManager)
    } else {
        rightSide.push(integratedClipboardManager)
    }

    if (emojiMenuPosition.get() === Position.LEFT) {
        leftSide.push(integratedEmojiMenu)
    } else {
        rightSide.push(integratedEmojiMenu)
    }

    if (notificationHistoryPosition.get() === Position.LEFT) {
        leftSide.push(integratedNotificationHistory)
    } else {
        rightSide.push(integratedNotificationHistory)
    }

    if (screenshotPositon.get() === Position.LEFT) {
        leftSide.push(integratedScreenshotTool)
    } else {
        rightSide.push(integratedScreenshotTool)
    }

    if (appLauncherPosition.get() === Position.LEFT) {
        leftSide.push(integratedAppLauncher)
    } else {
        rightSide.push(integratedAppLauncher)
    }

    if (screensharePosition.get() === Position.LEFT) {
        leftSide.push(integratedScreenshare)
    } else {
        rightSide.push(integratedScreenshare)
    }

    rightSide.reverse()

    return [leftSide, rightSide]
}

function TopGroup() {
    return <box
        $={(self) => {
            ghostWhenTooNarrow(
                self,
                [
                    variableConfig.topBar.paddingBottom.asAccessor(),
                    variableConfig.topBar.paddingTop.asAccessor(),
                    variableConfig.topBar.marginBottom.asAccessor(),
                    variableConfig.topBar.marginTop.asAccessor(),
                    variableConfig.topBar.borderWidth.asAccessor(),
                ]
            )
        }}
        orientation={Gtk.Orientation.HORIZONTAL}>
        <box hexpand={variableConfig.topBar.expanded.asAccessor().as((e) => !e)}/>
        <TopBar/>
        <box hexpand={variableConfig.topBar.expanded.asAccessor().as((e) => !e)}/>
    </box>
}

function BottomGroup() {
    return <box
        $={(self) => {
            ghostWhenTooNarrow(
                self,
                [
                    variableConfig.bottomBar.paddingBottom.asAccessor(),
                    variableConfig.bottomBar.paddingTop.asAccessor(),
                    variableConfig.bottomBar.marginBottom.asAccessor(),
                    variableConfig.bottomBar.marginTop.asAccessor(),
                    variableConfig.bottomBar.borderWidth.asAccessor(),
                ]
            )
        }}
        orientation={Gtk.Orientation.HORIZONTAL}>
        <box hexpand={variableConfig.bottomBar.expanded.asAccessor().as((e) => !e)}/>
        <BottomBar/>
        <box hexpand={variableConfig.bottomBar.expanded.asAccessor().as((e) => !e)}/>
    </box>
}

function LeftGroup() {
    return <box
        $={(self) => {
            ghostWhenTooNarrow(
                self,
                [
                    variableConfig.leftBar.paddingStart.asAccessor(),
                    variableConfig.leftBar.paddingEnd.asAccessor(),
                    variableConfig.leftBar.marginStart.asAccessor(),
                    variableConfig.leftBar.marginEnd.asAccessor(),
                    variableConfig.leftBar.borderWidth.asAccessor(),
                ]
            )
        }}
        orientation={Gtk.Orientation.VERTICAL}>
        <box vexpand={variableConfig.leftBar.expanded.asAccessor().as((e) => !e)}/>
        <BoxWithResize
            $={(self) => {
                self.connect("resized", (_, w, h) => {
                    leftGroupWidthSetter(w)
                })
                self.set_overflow(Gtk.Overflow.HIDDEN)
            }}
            vexpand={true}
            heightRequest={variableConfig.leftBar.minimumHeight.asAccessor()}
            marginStart={variableConfig.leftBar.marginStart.asAccessor()}
            marginEnd={variableConfig.leftBar.marginEnd.asAccessor()}
            marginTop={variableConfig.leftBar.marginTop.asAccessor()}
            marginBottom={variableConfig.leftBar.marginBottom.asAccessor()}
            cssClasses={["frameLeftGroup"]}>
            <box
                marginStart={variableConfig.leftBar.paddingStart.asAccessor()}
                marginEnd={variableConfig.leftBar.paddingEnd.asAccessor()}
                marginTop={variableConfig.leftBar.paddingTop.asAccessor()}
                marginBottom={variableConfig.leftBar.paddingBottom.asAccessor()}
                orientation={Gtk.Orientation.HORIZONTAL}
                $={(self) => {
                    leftGroup = self

                    const [leftSideWidgets, _] = getLeftAndRightSides()

                    appendChildren(leftGroup, leftSideWidgets)
                }}/>
        </BoxWithResize>
        <box vexpand={variableConfig.leftBar.expanded.asAccessor().as((e) => !e)}/>
    </box>
}

function RightGroup() {
    return <box
        $={(self) => {
            ghostWhenTooNarrow(
                self,
                [
                    variableConfig.rightBar.paddingStart.asAccessor(),
                    variableConfig.rightBar.paddingEnd.asAccessor(),
                    variableConfig.rightBar.marginStart.asAccessor(),
                    variableConfig.rightBar.marginEnd.asAccessor(),
                    variableConfig.rightBar.borderWidth.asAccessor(),
                ]
            )
        }}
        halign={Gtk.Align.END}
        orientation={Gtk.Orientation.VERTICAL}>
        <box vexpand={variableConfig.rightBar.expanded.asAccessor().as((e) => !e)}/>
        <BoxWithResize
            $={(self) => {
                self.connect("resized", (_, w, h) => {
                    rightGroupWidthSetter(w)
                })
                self.set_overflow(Gtk.Overflow.HIDDEN)
            }}
            vexpand={true}
            heightRequest={variableConfig.rightBar.minimumHeight.asAccessor()}
            marginStart={variableConfig.rightBar.marginStart.asAccessor()}
            marginEnd={variableConfig.rightBar.marginEnd.asAccessor()}
            marginTop={variableConfig.rightBar.marginTop.asAccessor()}
            marginBottom={variableConfig.rightBar.marginBottom.asAccessor()}
            cssClasses={["frameRightGroup"]}>
            <box
                marginStart={variableConfig.rightBar.paddingStart.asAccessor()}
                marginEnd={variableConfig.rightBar.paddingEnd.asAccessor()}
                marginTop={variableConfig.rightBar.paddingTop.asAccessor()}
                marginBottom={variableConfig.rightBar.paddingBottom.asAccessor()}
                orientation={Gtk.Orientation.HORIZONTAL}
                $={(self) => {
                    rightGroup = self

                    const [_, rightSideWidgets] = getLeftAndRightSides()

                    appendChildren(rightGroup, rightSideWidgets)
                }}/>
        </BoxWithResize>
        <box vexpand={variableConfig.rightBar.expanded.asAccessor().as((e) => !e)}/>
    </box>
}

export default function (): Astal.Window {

    const menuPosition = variableConfig.frame.menu.position.asAccessor()
    const calendarPosition = variableConfig.frame.calendar.position.asAccessor()
    const clipboardManagerPosition = variableConfig.frame.clipboardManager.position.asAccessor()
    const emojiMenuPosition = variableConfig.frame.emojiMenu.position.asAccessor()
    const notificationHistoryPosition = variableConfig.frame.notifications.position.asAccessor()
    const screenshotPositon = variableConfig.frame.screenshotTool.position.asAccessor()
    const appLauncherPosition = variableConfig.frame.appLauncher.position.asAccessor()
    const screensharePosition = variableConfig.frame.screenshare.position.asAccessor()

    // Lógica para bloquear Hyprland dinámicamente si cualquier panel modal está abierto
    const modalUnsub = createComputed([
        integratedClipboardManagerRevealed,
        integratedEmojiMenuRevealed
    ]).subscribe(() => {
        const isAnyModalOpen = integratedClipboardManagerRevealed.get() || integratedEmojiMenuRevealed.get();
        setCurrentKeymode(isAnyModalOpen ? Astal.Keymode.EXCLUSIVE : Astal.Keymode.ON_DEMAND);
    });

    const unsub = createComputed([
        menuPosition,
        calendarPosition,
        clipboardManagerPosition,
        emojiMenuPosition,
        notificationHistoryPosition,
        screenshotPositon,
        appLauncherPosition,
        screensharePosition,
    ]).subscribe(() => {
        removeAllChildren(leftGroup)
        removeAllChildren(rightGroup)

        const [leftSideWidgets, rightSideWidgets] = getLeftAndRightSides()

        appendChildren(leftGroup, leftSideWidgets)
        appendChildren(rightGroup, rightSideWidgets)
    })
    
    onCleanup(() => {
        unsub()
        modalUnsub()
    })

    integratedMenu = <IntegratedMenu/> as Gtk.Widget
    integratedCalendar = <IntegratedCalendar/> as Gtk.Widget
    integratedClipboardManager = <IntegratedClipboardManager/> as Gtk.Widget
    integratedEmojiMenu = <IntegratedEmojiMenu/> as Gtk.Widget
    integratedNotificationHistory = <IntegratedNotificationHistory/> as Gtk.Widget
    integratedScreenshotTool = <IntegratedScreenshot/> as Gtk.Widget
    integratedAppLauncher = <IntegratedAppLauncher/> as Gtk.Widget
    integratedScreenshare = <IntegratedScreenshare/> as Gtk.Widget
    leftBar = <LeftBar/> as Gtk.Widget
    rightBar = <RightBar/> as Gtk.Widget

    return <window
        $={(self) => {
            frameWindow = self
        }}
        name={frameWindowName}
        // Usamos el keymode dinámico
        keymode={currentKeymode.as(k => k)}
        cssClasses={["transparentBackground"]}
        layer={Astal.Layer.TOP}
        namespace={"okpanel-frame"}
        exclusivity={Astal.Exclusivity.IGNORE}
        anchor={Astal.WindowAnchor.RIGHT | Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT}
        visible={true}
        application={App}>
        <overlay
            $={(overlay) => {
                overlay.add_overlay(
                    <box
                        vexpand={true}
                        hexpand={true}
                        orientation={Gtk.Orientation.VERTICAL}>
                        <TopGroup/>
                        <box
                            vexpand={true}
                            hexpand={true}
                            orientation={Gtk.Orientation.HORIZONTAL}>
                            <LeftGroup/>
                            <box hexpand/>
                            <RightGroup/>
                        </box>
                        <BottomGroup/>
                    </box> as Gtk.Box
                )
            }}>
            <FrameDrawing/>
        </overlay>
    </window> as Astal.Window
}
