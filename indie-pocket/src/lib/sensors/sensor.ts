import {ReplaySubject} from "rxjs";
import {
    SENSOR_ACCELEROMETER,
    SENSOR_GYROSCOPE,
    SENSOR_LIGHT,
    SENSOR_PRESSURE,
    SENSOR_STEP,
    SensorDelay
} from "~/lib/sensors/messages";
import {debugOpt} from "~/lib/global";
import {
    startAccelerometerUpdates,
    startGyroscopeUpdates,
    startLightUpdates,
    startPressureUpdates,
    startStepUpdates,
    stopAccelerometerUpdates,
    stopGyroscopeUpdates,
    stopLightUpdates,
    stopPressureUpdates,
    stopStepUpdates
} from "~/lib/sensors/index";

export interface ISensor {
    sensor: string;
    values: Map<string, number>;
    time: number;
}

export class Sensor extends ReplaySubject<ISensor> {
    static all = [SENSOR_ACCELEROMETER, SENSOR_PRESSURE, SENSOR_GYROSCOPE, SENSOR_LIGHT, SENSOR_STEP];
    static delay: SensorDelay = "game";
    private latest = Date.now();

    constructor(public name: string, newValues: ReplaySubject<ISensor>) {
        super(1);
        newValues.subscribe({
            next: (values) => {
                if (debugOpt.showDT && values.sensor === SENSOR_ACCELEROMETER) {
                    const now = Date.now();
                    console.log("measurem:", now - this.latest);
                    this.latest = now;
                }
                this.next(values)
            }
        })
    }

    static getSensor(sensor: string): Sensor | undefined {
        const rs = new ReplaySubject<ISensor>(1);
        try {
            switch (sensor) {
                case SENSOR_ACCELEROMETER:
                    startAccelerometerUpdates((ad) => {
                        rs.next({
                            sensor,
                            values: new Map([
                                ["x", ad.x],
                                ["y", ad.y],
                                ["z", ad.z],
                            ]),
                            time: ad.time
                        })
                    }, {sensorDelay: Sensor.delay});
                    break;
                case SENSOR_PRESSURE:
                    startPressureUpdates((pressure) => {
                        rs.next(
                            {
                                sensor,
                                values: new Map([["mbar", pressure.mbar]]),
                                time: pressure.time
                            }
                        );
                    }, {sensorDelay: Sensor.delay});
                    break;
                case SENSOR_GYROSCOPE:
                    startGyroscopeUpdates((gyroscope) => {
                        rs.next({
                            sensor,
                            values: new Map([
                                    ["x", gyroscope.x],
                                    ["y", gyroscope.y],
                                    ["z", gyroscope.z]
                                ]
                            ),
                            time: gyroscope.time
                        });
                    }, {sensorDelay: Sensor.delay});
                    break;
                case SENSOR_LIGHT:
                    startLightUpdates((lux) => {
                        rs.next(
                            {
                                sensor,
                                values: new Map([["lux", lux.lux]]),
                                time: lux.time
                            });
                    }, {sensorDelay: Sensor.delay});
                    break;
                case SENSOR_STEP:
                    startStepUpdates((step) => {
                        rs.next(
                            {
                                sensor,
                                values: new Map([["counter", step.counter]]),
                                time: step.time
                            });
                    }, {sensorDelay: Sensor.delay});
                    break;
                default:
                    return undefined;
            }
        } catch (e) {
            console.log("couldn't get sensor", sensor, e);
            // rs.next(new Map([["not available", e]]));
        }
        return new Sensor(sensor, rs)
    }

    stop() {
        switch (this.name) {
            case SENSOR_ACCELEROMETER:
                stopAccelerometerUpdates();
                break;
            case SENSOR_PRESSURE:
                stopPressureUpdates();
                break;
            case SENSOR_GYROSCOPE:
                stopGyroscopeUpdates();
                break;
            case SENSOR_LIGHT:
                stopLightUpdates();
                break;
            case SENSOR_STEP:
                stopStepUpdates();
                break;
        }
    }
}
