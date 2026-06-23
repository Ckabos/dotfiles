export function isFraction(value: number): boolean {
    return Number.isFinite(value) && !Number.isInteger(value)
}