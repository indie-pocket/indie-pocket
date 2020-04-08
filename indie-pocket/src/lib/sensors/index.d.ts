import {AccelerometerData, GyroscopeData, LightData, PressureData, SensorOptions, StepData} from "~/lib/sensors/messages";

export function startAccelerometerUpdates(callback: (data: AccelerometerData) => void, options?: SensorOptions): void;
export function stopAccelerometerUpdates(): void;
export function isListeningAccelerometer(): boolean;

export function startGyroscopeUpdates(callback: (data: GyroscopeData) => void, options?: SensorOptions): void;
export function stopGyroscopeUpdates(): void;
export function isListeningGyroscope(): boolean;

export function startLightUpdates(callback: (data: LightData) => void, options?: SensorOptions): void;
export function stopLightUpdates(): void;
export function isListeningLight(): boolean;

export function startStepUpdates(callback: (data: StepData) => void, options?: SensorOptions): void;
export function stopStepUpdates(): void;
export function isListeningStep(): boolean;

export function startPressureUpdates(callback: (data: PressureData) => void, options?: SensorOptions);
export function stopPressureUpdates();
export function isListeningPressure(): boolean;

