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
import {allowSleepAgain, keepAwake} from "nativescript-insomnia";
import { TNSPlayer } from 'nativescript-audio';


/**
 * DebugComponent gives a live view of the different sensors.
 * @TODO: use the same sensor-library as PocketComponent
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
    }

    ngOnInit(): void {
        if (debugOpt.startCheckSleep) {
            this.checkSleep();
        }
    }

    async checkSleep() {
        await this.stop();
        await keepAwake();

        const acc = Sensor.getSensor(SENSOR_ACCELEROMETER);
        if (acc) {
            this.sensors.push(new SensorView(acc));
            let last = 0;
            const div = isAndroid ? 1e9 : 1;
            acc.pipe(
                filter((s) => Math.floor(s.time / div) > last),
                tap(s => last = Math.floor(s.time / div)),
                tap(s => Log.lvl1(last))
            ).subscribe({
                next: (value) => {
                    const sec = Math.floor(value.time / div);
                    this.count.unshift((sec % 3600).toString());
                    this.count.splice(50);
                }
            })
        }
    }

    async startAll() {
        await this.stop();
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

    async stop() {
        // This is only to make sure the library is in the 0.6.x version, so that
        // the issue #6 can be done in an update without re-installation.
        const player = new TNSPlayer();
        try {
            await player.initFromFile({
                audioFile: "~/samples/End-of-recording.mp3",
                loop: false,
            });
            await player.play();
        } catch(e){
            Log.error("couldn't start file:", e);
        }
        Log.lvl2("started file");
        for (const sensor of this.sensors) {
            sensor.stop();
        }
        this.sensors.splice(0);
        this.count = [];
    }

    async goMeasure() {
        await allowSleepAgain();
        this.stop();
        this.routerExtensions.navigateByUrl("/",
            {clearHistory: true});
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
