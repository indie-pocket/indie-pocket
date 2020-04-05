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
export const SENSOR_PRESSURE = "barometer";
export const SENSOR_GYROSCOPE = "gyroscope";
export const SENSOR_LIGHT = "lux";
export const SENSOR_STEP = "step";
export type SensorType = "accelerometer" | "barometer" | "gyroscope" | "lux" | "step";
export type SensorDelay = "normal" | "game" | "ui" | "fastest";
export interface SensorOptions {
    sensorDelay?: SensorDelay;
}
