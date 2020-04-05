/// <reference path="../../node_modules/tns-platform-declarations/android.d.ts" /> Needed for autocompletion and
// compilation.

import { ad as androidUtils } from "tns-core-modules/utils/utils";
import {
    AccelerometerData,
    GyroscopeData, LightData,
    PressureData,
    SensorOptions,
    startButNotStopped, StepData,
    stopButNotStarted
} from "./messages";

function getNativeDelay(options?: SensorOptions): number {
    if (!options || !options.sensorDelay) {
        return android.hardware.SensorManager.SENSOR_DELAY_NORMAL;
    }

    switch (options.sensorDelay) {
        case "normal":
            return android.hardware.SensorManager.SENSOR_DELAY_NORMAL;

        case "game":
            return android.hardware.SensorManager.SENSOR_DELAY_GAME;

        case "ui":
            return android.hardware.SensorManager.SENSOR_DELAY_UI;

        case "fastest":
            return android.hardware.SensorManager.SENSOR_DELAY_FASTEST;
    }
}

const baseAcceleration = -9.81;
var sensorAccelerometerListener: android.hardware.SensorEventListener;
var sensorManager: android.hardware.SensorManager;
var accelerometerSensor: android.hardware.Sensor;

export function startAccelerometerUpdates(callback: (data: AccelerometerData) => void, options?: SensorOptions) {
    if (isListeningAccelerometer()) {
        console.log(startButNotStopped);
        stopAccelerometerUpdates();
    }

    const wrappedCallback = zonedCallback(callback);
    const context: android.content.Context = androidUtils.getApplicationContext();
    if (!context) {
        throw Error("Could not get Android application context.")
    }

    if (!sensorManager) {
        sensorManager = context.getSystemService(android.content.Context.SENSOR_SERVICE);

        if (!sensorManager) {
            throw Error("Could not initialize SensorManager.")
        }
    }

    if (!accelerometerSensor) {
        accelerometerSensor = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_ACCELEROMETER);
        if (!accelerometerSensor) {
            throw Error("Could get accelerometer sensor.")
        }
    }


    sensorAccelerometerListener = new android.hardware.SensorEventListener({
        onAccuracyChanged: (sensor, accuracy) => {
        },
        onSensorChanged: (event) => {
            wrappedCallback({
                x: event.values[0] / baseAcceleration,
                y: event.values[1] / baseAcceleration,
                z: event.values[2] / baseAcceleration
            })
        }
    });

    const nativeDelay = getNativeDelay(options);
    sensorManager.registerListener(
        sensorAccelerometerListener,
        accelerometerSensor,
        nativeDelay
    );
}

export function stopAccelerometerUpdates() {
    if (sensorAccelerometerListener) {
        sensorManager.unregisterListener(sensorAccelerometerListener);
        sensorAccelerometerListener = undefined;
    } else {
        console.log(stopButNotStarted);
    }
}

export function isListeningAccelerometer(): boolean {
    return !!sensorAccelerometerListener;
}

var gyroscopeSensor: android.hardware.Sensor;
var sensorGyroscopeListener: android.hardware.SensorEventListener;

export function startGyroscopeUpdates(callback: (data: GyroscopeData) => void, options?: SensorOptions) {
    if (isListeningAccelerometer()) {
        console.log(startButNotStopped);
        stopGyroscopeUpdates();
    }

    const wrappedCallback = zonedCallback(callback);
    const context: android.content.Context = androidUtils.getApplicationContext();
    if (!context) {
        throw Error("Could not get Android application context.")
    }

    if (!sensorManager) {
        sensorManager = context.getSystemService(android.content.Context.SENSOR_SERVICE);

        if (!sensorManager) {
            throw Error("Could not initialize SensorManager.")
        }
    }

    if (!gyroscopeSensor) {
        gyroscopeSensor = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_GYROSCOPE);
        if (!gyroscopeSensor) {
            throw Error("Could get gyroscope sensor.")
        }
    }


    sensorGyroscopeListener = new android.hardware.SensorEventListener({
        onAccuracyChanged: (sensor, accuracy) => {
        },
        onSensorChanged: (event) => {
            wrappedCallback({
                x: event.values[0],
                y: event.values[1],
                z: event.values[2]
            })
        }
    });

    const nativeDelay = getNativeDelay(options);
    sensorManager.registerListener(
        sensorGyroscopeListener,
        gyroscopeSensor,
        nativeDelay
    );
}

export function stopGyroscopeUpdates() {
    if (sensorGyroscopeListener) {
        sensorManager.unregisterListener(sensorGyroscopeListener);
        sensorGyroscopeListener = undefined;
    } else {
        console.log(stopButNotStarted);
    }
}

export function isListeningGyroscope(): boolean {
    return !!sensorGyroscopeListener;
}

var pressureSensor: android.hardware.Sensor;
var sensorPressureListener: android.hardware.SensorEventListener;

export function startPressureUpdates(callback: (data: PressureData) => void, options?: SensorOptions) {
    if (isListeningAccelerometer()) {
        console.log(startButNotStopped);
        stopPressureUpdates();
    }

    const wrappedCallback = zonedCallback(callback);
    const context: android.content.Context = androidUtils.getApplicationContext();
    if (!context) {
        throw Error("Could not get Android application context.")
    }

    if (!sensorManager) {
        sensorManager = context.getSystemService(android.content.Context.SENSOR_SERVICE);

        if (!sensorManager) {
            throw Error("Could not initialize SensorManager.")
        }
    }

    if (!pressureSensor) {
        pressureSensor = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_PRESSURE);
        if (!pressureSensor) {
            throw Error("Could get pressure sensor.")
        }
    }


    sensorPressureListener = new android.hardware.SensorEventListener({
        onAccuracyChanged: (sensor, accuracy) => {
        },
        onSensorChanged: (event) => {
            wrappedCallback({
                mbar: event.values[0]
            })
        }
    });

    const nativeDelay = getNativeDelay(options);
    sensorManager.registerListener(
        sensorPressureListener,
        pressureSensor,
        nativeDelay
    );
}

export function stopPressureUpdates() {
    if (sensorPressureListener) {
        sensorManager.unregisterListener(sensorPressureListener);
        sensorPressureListener = undefined;
    } else {
        console.log(stopButNotStarted);
    }
}

export function isListeningPressure(): boolean {
    return !!sensorPressureListener;
}

var lightSensor: android.hardware.Sensor;
var sensorLightListener: android.hardware.SensorEventListener;

export function startLightUpdates(callback: (data: LightData) => void, options?: SensorOptions) {
    if (isListeningAccelerometer()) {
        console.log(startButNotStopped);
        stopLightUpdates();
    }

    const wrappedCallback = zonedCallback(callback);
    const context: android.content.Context = androidUtils.getApplicationContext();
    if (!context) {
        throw Error("Could not get Android application context.")
    }

    if (!sensorManager) {
        sensorManager = context.getSystemService(android.content.Context.SENSOR_SERVICE);

        if (!sensorManager) {
            throw Error("Could not initialize SensorManager.")
        }
    }

    if (!lightSensor) {
        lightSensor = sensorManager.getDefaultSensor(android.hardware.Sensor.TYPE_LIGHT);
        if (!lightSensor) {
            throw Error("Could get light sensor.")
        }
    }


    sensorLightListener = new android.hardware.SensorEventListener({
        onAccuracyChanged: (sensor, accuracy) => {
        },
        onSensorChanged: (event) => {
            wrappedCallback({
                lux: event.values[0]
            })
        }
    });

    const nativeDelay = getNativeDelay(options);
    sensorManager.registerListener(
        sensorLightListener,
        lightSensor,
        nativeDelay
    );
}

export function stopLightUpdates() {
    if (sensorLightListener) {
        sensorManager.unregisterListener(sensorLightListener);
        sensorLightListener = undefined;
    } else {
        console.log(stopButNotStarted);
    }
}

export function isListeningLight(): boolean {
    return !!sensorLightListener;
}

var stepSensor: android.hardware.Sensor;
var sensorStepListener: android.hardware.SensorEventListener;

export function startStepUpdates(callback: (data: StepData) => void, options?: SensorOptions) {
    if (isListeningAccelerometer()) {
        console.log(startButNotStopped);
        stopStepUpdates();
    }

    const wrappedCallback = zonedCallback(callback);
    const context: android.content.Context = androidUtils.getApplicationContext();
    if (!context) {
        throw Error("Could not get Android application context.")
    }

    if (!sensorManager) {
        sensorManager = context.getSystemService(android.content.Context.SENSOR_SERVICE);

        if (!sensorManager) {
            throw Error("Could not initialize SensorManager.")
        }
    }

    if (!stepSensor) {
        // 19 is TYPE_STEP_COUNTER, but it is not defined...
        stepSensor = sensorManager.getDefaultSensor(19);
        if (!stepSensor) {
            throw Error("Could get step sensor.")
        }
    }


    sensorStepListener = new android.hardware.SensorEventListener({
        onAccuracyChanged: (sensor, accuracy) => {
        },
        onSensorChanged: (event) => {
            wrappedCallback({
                counter: event.values[0]
            })
        }
    });

    const nativeDelay = getNativeDelay(options);
    sensorManager.registerListener(
        sensorStepListener,
        stepSensor,
        nativeDelay
    );
}

export function stopStepUpdates() {
    if (sensorStepListener) {
        sensorManager.unregisterListener(sensorStepListener);
        sensorStepListener = undefined;
    } else {
        console.log(stopButNotStarted);
    }
}

export function isListeningStep(): boolean {
    return !!sensorStepListener;
}

