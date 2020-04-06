import {Component, OnInit} from '@angular/core';
import {
    startAccelerometerUpdates,
    startGyroscopeUpdates,
    startPressureUpdates,
    startLightUpdates,
    startStepUpdates
} from "~/lib";
import {
    SENSOR_ACCELEROMETER,
    SENSOR_GYROSCOPE, SENSOR_LIGHT,
    SENSOR_PRESSURE,
    SENSOR_STEP,
    SensorType
} from "~/lib/messages";
import {ReplaySubject} from "rxjs";

@Component({
    selector: 'ns-debug',
    templateUrl: './debug.component.html',
    styleUrls: ['./debug.component.css']
})
export class DebugComponent implements OnInit {
    public sensors = new Array<Sensor>();

    constructor() {
        console.log("new component");
    }

    ngOnInit(): void {
        const acc = Sensor.getSensor(SENSOR_ACCELEROMETER);
        if (acc) {
            this.sensors.push(acc);
        }
        const gyroscope = Sensor.getSensor(SENSOR_GYROSCOPE);
        if (gyroscope) {
            this.sensors.push(gyroscope);
        }
        const light = Sensor.getSensor(SENSOR_LIGHT);
        if (light) {
            this.sensors.push(light);
        }
        const step = Sensor.getSensor(SENSOR_STEP);
        if (step) {
            this.sensors.push(step);
        }
        const pressure = Sensor.getSensor(SENSOR_PRESSURE);
        if (pressure) {
            this.sensors.push(pressure);
        }
    }

}

class Sensor {
    public values: string;
    private buffer = [new Map<string, string>()];

    constructor(public name: string, newValues: ReplaySubject<Map<string, string>>) {
        newValues.subscribe({next: (newV) => this.addValue(newV)})
    }

    static getSensor(type: SensorType): Sensor | undefined {
        const rs = new ReplaySubject<Map<string, string>>(1);
        try {
            switch (type) {
                case SENSOR_ACCELEROMETER:
                    startAccelerometerUpdates((ad) => {
                        rs.next(new Map([
                            ["x", ad.x.toString()],
                            ["y", ad.y.toString()],
                            ["z", ad.z.toString()],
                        ]))
                    }, {sensorDelay: "normal"});
                    break;
                case SENSOR_PRESSURE:
                    startPressureUpdates((pressure) => {
                        rs.next(new Map([["mbar", pressure.mbar.toString()]]));
                    }, {sensorDelay: "normal"});
                    break;
                case SENSOR_GYROSCOPE:
                    startGyroscopeUpdates((gyroscope) => {
                        rs.next(new Map([
                                ["x", gyroscope.x.toString()],
                                ["y", gyroscope.y.toString()],
                                ["z", gyroscope.z.toString()]
                            ]
                        ));
                    }, {sensorDelay: "normal"});
                    break;
                case SENSOR_LIGHT:
                    startLightUpdates((lux) => {
                        rs.next(new Map([["lux", lux.lux.toString()]]));
                    }, {sensorDelay: "normal"});
                    break;
                case SENSOR_STEP:
                    startStepUpdates((step) => {
                        rs.next(new Map([["counter", step.counter.toString()]]));
                    }, {sensorDelay: "normal"});
                    break;
                default:
                    return undefined;
            }
        } catch (e) {
            console.log("couldn't get sensor", type, e);
            rs.next(new Map([["not available", e]]));
        }
        return new Sensor(type, rs)
    }

    addValue(newV: Map<string, string>) {
        this.buffer.push(newV);
        this.values = [...newV].toString();
        console.log(this.values);
    }
}
