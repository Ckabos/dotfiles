import {exec} from "ags/process";

export function parseYaml(path: string): Record<string, any> {
    const result = exec(["yq", "eval", "-o=json", path])

    return JSON.parse(result)
}