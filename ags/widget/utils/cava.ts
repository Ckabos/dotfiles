import {variableConfig} from "../../config/config";
import {Bar} from "../../config/bar";
import {WaveformPosition} from "../../config/schema/definitions/barWidgets";
import {Accessor, createComputed} from "ags";

export function getCavaFlipStartValue(bar: Bar): Accessor<boolean> {
    switch (bar) {
        case Bar.TOP:
            return createComputed([
                variableConfig.barWidgets.cavaWaveform.position.asAccessor(),
            ], (position) => {
                switch (position) {
                    case WaveformPosition.START:
                        return true
                    case WaveformPosition.END:
                        return false
                    case WaveformPosition.OUTER:
                        return true
                    case WaveformPosition.INNER:
                        return false
                }
            })
        case Bar.BOTTOM:
            return createComputed([
                variableConfig.barWidgets.cavaWaveform.position.asAccessor(),
            ], (position) => {
                switch (position) {
                    case WaveformPosition.START:
                        return true
                    case WaveformPosition.END:
                        return false
                    case WaveformPosition.OUTER:
                        return false
                    case WaveformPosition.INNER:
                        return true
                }
            })
        case Bar.LEFT:
            return createComputed([
                variableConfig.barWidgets.cavaWaveform.position.asAccessor(),
            ], (position) => {
                switch (position) {
                    case WaveformPosition.START:
                        return true
                    case WaveformPosition.END:
                        return false
                    case WaveformPosition.OUTER:
                        return true
                    case WaveformPosition.INNER:
                        return false
                }
            })
        case Bar.RIGHT:
            return createComputed([
                variableConfig.barWidgets.cavaWaveform.position.asAccessor(),
            ], (position) => {
                switch (position) {
                    case WaveformPosition.START:
                        return true
                    case WaveformPosition.END:
                        return false
                    case WaveformPosition.OUTER:
                        return false
                    case WaveformPosition.INNER:
                        return true
                }
            })
    }
}