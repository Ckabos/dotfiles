import Wp from "gi://AstalWp"
import {execAsync} from "ags/process";
import {variableConfig} from "../../config/config";

import {projectDir} from "../../app";

export function getVolumeIcon(speaker?: Wp.Endpoint) {
    let volume = speaker?.volume
    let muted = speaker?.mute
    let speakerIcon = speaker?.icon
    if (volume == null || speakerIcon == null) return ""

    if (speakerIcon.includes("bluetooth")) {
        if (volume === 0 || muted) {
            return "󰟎"
        } else {
            return "󰥰"
        }
    } else if (speakerIcon.includes("headset")) {
        if (volume === 0 || muted) {
            return "󰟎"
        } else {
            return "󰋋"
        }
    } else {
        if (volume === 0 || muted) {
            return ""
        } else if (volume < 0.33) {
            return ""
        } else if (volume < 0.66) {
            return ""
        } else {
            return ""
        }
    }
}

export function getMicrophoneIcon(mic?: Wp.Endpoint): string {
    let volume = mic?.volume
    let muted = mic?.mute
    let micIcon = mic?.icon

    if (micIcon != null && micIcon.includes("bluetooth")) {
        if (volume === 0 || muted) {
            return "󰟎"
        } else {
            return "󰥰"
        }
    } else if (micIcon != null && micIcon.includes("headset")) {
        if (volume === 0 || muted) {
            return "󰋐"
        } else {
            return "󰋎"
        }
    } else {
        if (volume === 0 || muted) {
            return ""
        } else {
            return ""
        }
    }
}

export function toggleMuteEndpoint(endpoint?: Wp.Endpoint) {
    endpoint?.set_mute(!endpoint?.mute)
}

export function muteVolume() {
    const defaultSpeaker = Wp.get_default()!.audio.default_speaker
    defaultSpeaker?.set_mute(!defaultSpeaker?.mute)
    playVolumeTick()
}

export function increaseVolume() {
    const defaultSpeaker = Wp.get_default()!.audio.default_speaker
    const currentVolume = defaultSpeaker.volume
    if (currentVolume < 0.95) {
        defaultSpeaker.volume = currentVolume + 0.05
    } else {
        defaultSpeaker.volume = 1
    }
    playVolumeTick()
}

export function decreaseVolume() {
    const defaultSpeaker = Wp.get_default()!.audio.default_speaker
    const currentVolume = defaultSpeaker.volume
    if (currentVolume > 0.05) {
        defaultSpeaker.volume = currentVolume - 0.05
    } else {
        defaultSpeaker.volume = 0
    }
    playVolumeTick()
}

export function playVolumeTick() {
    if (variableConfig.sounds.playVolumeChangingSound.get()) {
        let path = variableConfig.sounds.volumeChangingSoundPath.get() !== ""
            ? variableConfig.sounds.volumeChangingSoundPath.get()
            : `${projectDir}/sounds/audio-volume-change.oga`
        execAsync(`bash -c "play ${path}"`)
            .catch((error) => {
                console.error(error)
            })
    }
}

export function playCameraShutter() {
    if (variableConfig.sounds.playScreenshotSound.get()) {
        let path = variableConfig.sounds.screenshotSoundPath.get() !== ""
            ? variableConfig.sounds.screenshotSoundPath.get()
            : `${projectDir}/sounds/camera-shutter.ogg`
        execAsync(`bash -c "play ${path}"`)
            .catch((error) => {
                console.error(error)
            })
    }
}

// AstalNotifd.Urgency.CRITICAL === 2 (LOW=0, NORMAL=1). Lo dejamos como constante
// para no importar el módulo solo por el enum.
const URGENCY_CRITICAL = 2

export function playNotificationSound(urgency?: number, appName?: string) {
    if (!variableConfig.sounds.playNotificationSound.get()) {
        return
    }

    // Apps silenciadas: lista separada por comas, sin distinguir mayúsculas.
    const muted = variableConfig.sounds.mutedNotificationApps.get()
    if (muted !== "" && appName) {
        const mutedList = muted.split(",").map((s) => s.trim().toLowerCase()).filter((s) => s !== "")
        if (mutedList.includes(appName.toLowerCase())) {
            return
        }
    }

    // Sonido distinto para urgencia CRÍTICA si hay uno configurado.
    const criticalPath = variableConfig.sounds.criticalNotificationSoundPath.get()
    let path = variableConfig.sounds.notificationSoundPath.get()
    if (urgency === URGENCY_CRITICAL && criticalPath !== "") {
        path = criticalPath
    }

    // No hay sonido de notificación incluido por defecto: requiere un archivo del usuario.
    if (path === "") {
        return
    }
    // Array form (sin shell): soporta rutas con espacios y evita inyección.
    execAsync(["play", path])
        .catch((error) => {
            console.error(error)
        })
}

export function playBatteryWarning() {
    if (variableConfig.sounds.playLowBatteryWarningSound.get()) {
        let path = variableConfig.sounds.lowBatteryWarningSoundPath.get() !== ""
            ? variableConfig.sounds.lowBatteryWarningSoundPath.get()
            : `${projectDir}/sounds/battery-low.ogg`
        execAsync(`bash -c "play ${path}"`)
            .catch((error) => {
                console.error(error)
            })
    }
}

export function playPowerPlug() {
    if (variableConfig.sounds.playChargingSound.get()) {
        let path = variableConfig.sounds.chargingPlugInSoundPath.get() !== ""
            ? variableConfig.sounds.chargingPlugInSoundPath.get()
            : `${projectDir}/sounds/power-plug.ogg`
        execAsync(`bash -c "play ${path}"`)
            .catch((error) => {
                console.error(error)
            })
    }
}

export function playPowerUnplug() {
    if (variableConfig.sounds.playChargingSound.get()) {
        let path = variableConfig.sounds.chargingUnplugSoundPath.get() !== ""
            ? variableConfig.sounds.chargingUnplugSoundPath.get()
            : `${projectDir}/sounds/power-unplug.ogg`
        execAsync(`bash -c "play ${path}"`)
            .catch((error) => {
                console.error(error)
            })
    }
}
