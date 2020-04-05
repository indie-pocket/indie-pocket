export interface AccelerometerData {
    time: number;
    x: number;
    y: number;
    z: number;
}

export interface PressureData {
    time: number;
    mbar: number;
}

export interface GyroscopeData {
    time: number;
    x: number;
    y: number;
    z: number;
}

export interface LightData {
    time: number;
    lux: number;
}

export interface StepData {
    time: number;
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
