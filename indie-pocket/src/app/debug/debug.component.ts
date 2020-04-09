import {RouterExtensions} from "nativescript-angular/router";
import {Component, OnInit} from '@angular/core';
import {
    SENSOR_ACCELEROMETER,
    SENSOR_GYROSCOPE,
    SENSOR_LIGHT,
    SENSOR_PRESSURE,
    SENSOR_STEP
} from "~/lib/sensors/messages";
import {Sensor} from "~/lib/sensors/sensor";
import {filter, tap} from "rxjs/internal/operators";
import {Subscription} from "rxjs";
import {Log} from "~/lib/log";
import {isAndroid} from "tns-core-modules/platform";
import {debugOpt} from "~/lib/global";

/**
 * DebugComponent gives a live view of the different sensors.
 * @TODO: use the same sensor-library as MeasureComponent
 */
@Component({
    selector: 'ns-debug',
    templateUrl: './debug.component.html',
    styleUrls: ['./debug.component.css']
})
export class DebugComponent implements OnInit {
    public sensors = new Array<SensorView>();
    public count: string[] = [];

    constructor(
        private routerExtensions: RouterExtensions,
    ) {
        console.log("new component");
    }

    ngOnInit(): void {
        if (debugOpt.startCheckSleep) {
            this.checkSleep();
        }
    }

    checkSleep() {
        this.stop();
        const acc = Sensor.getSensor(SENSOR_ACCELEROMETER);
        if (acc) {
            this.sensors.push(new SensorView(acc));
            let last = 0;
            const div = isAndroid ? 1e9 : 1;
            acc.pipe(
                filter((s) => Math.floor(s.time / div) > last),
                tap(s => last = Math.floor(s.time / div)),
                tap(s => Log.print(last))
            ).subscribe({
                next: (value) => {
                    const sec = Math.floor(value.time / div);
                    this.count.unshift((sec % 3600).toString());
                    this.count.splice(50);
                }
            })
        }
    }

    startAll() {
        this.stop();
        for (const sensor of [SENSOR_ACCELEROMETER, SENSOR_GYROSCOPE, SENSOR_LIGHT, SENSOR_STEP, SENSOR_PRESSURE]) {
            try {
                Log.lvl2("getting sensor", sensor);
                const s = Sensor.getSensor(sensor);
                if (s) {
                    Log.lvl2("got sensor", sensor);
                    this.sensors.push(new SensorView(s));
                }
            } catch (e) {
                Log.warn("couldn't get sensor", sensor)
            }
        }
    }

    stop() {
        for (const sensor of this.sensors) {
            sensor.stop();
        }
        this.sensors.splice(0);
        this.count = [];
    }

    goMeasure() {
        this.stop();
        this.routerExtensions.navigateByUrl("/");
    }
}

class SensorView extends Sensor {
    public values: string;
    private sub: Subscription;

    constructor(s: Sensor) {
        super(s.name, s);
        this.sub = s.subscribe({next: is => this.values = [...is.values].toString()})
    }

    stop() {
        super.stop();
        this.sub.unsubscribe();
    }
}
