export const stopButNotStarted = "[nativescript-accelerometer] stopAccelerometerUpdates() called, but currently not listening. Ignoring...";
export const startButNotStopped = "[nativescript-accelerometer] startAccelerometerUpdates() called, but there is active listener. Will stop the current listener and switch to the new one.";

export interface AccelerometerData {
    x: number;
    y: number;
    z: number;
}

export interface PressureData {
    mbar: number;
}

export interface GyroscopeData {
    x: number;
    y: number;
    z: number;
}

export interface LightData {
    lux: number;
}

export interface StepData {
    counter: number;
}

export const SENSOR_ACCELEROMETER = "accelerometer";
export const SENSOR_PRESSURE = "pressure";
export const SENSOR_GYROSCOPE = "gyroscope";
export const SENSOR_LIGHT = "light";
export const SENSOR_STEP = "step";
export type SensorType = "accelerometer" | "pressure" | "gyroscope" | "light" | "step";
export type SensorDelay = "normal" | "game" | "ui" | "fastest";
export interface SensorOptions {
    sensorDelay?: SensorDelay;
}
