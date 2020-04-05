/// <reference path="../../../node_modules/tns-platform-declarations/android.d.ts" /> Needed for autocompletion and
// compilation.

import {Component, OnInit} from '@angular/core';
import {RouterExtensions} from "nativescript-angular/router";
import * as platform from "tns-core-modules/platform"
import * as utils from "tns-core-modules/utils/utils"
import {File, knownFolders} from "tns-core-modules/file-system"
import * as Sqlite from "nativescript-sqlite";
import {NativescriptWebSocketAdapter} from "~/lib_acc/websocket";
import {ReplaySubject} from "rxjs";
import {
    SENSOR_ACCELEROMETER,
    SENSOR_GYROSCOPE,
    SENSOR_LIGHT,
    SENSOR_PRESSURE,
    SENSOR_STEP,
    SensorDelay
} from "~/lib_acc/messages";
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
} from "~/lib_acc";
import {confirm} from "tns-core-modules/ui/dialogs";

@Component({
    selector: 'ns-measure',
    templateUrl: './measure.component.html',
    styleUrls: ['./measure.component.css']
})
export class MeasureComponent implements OnInit {
    public labels = new Labels();
    public zeroToFive = [...Array(6).keys()];
    public zeroToSeven = [...Array(8).keys()];
    public uploading = -1;
    private db: DataBase;
    private collector: Collector;

    constructor(private routerExtensions: RouterExtensions) {
    }

    get recording(): boolean {
        const a = this.labels.active();
        if (this.collector) {
            if (a && !this.collector.isRunning()) {
                this.collector.start()
            } else if (!a && this.collector.isRunning()) {
                this.collector.stop();
            }
        }
        return a;
    }

    async ngOnInit() {
        this.db = await DataBase.createDB(this.labels);
        this.collector = new Collector(this.db, this.labels);
    }

    async stop() {
        let options = {
            title: "Finish Recording",
            message: "Stop recording and upload data to server?",
            okButtonText: "Stop and upload",
            cancelButtonText: "Only stop",
            neutralButtonText: "Continue Recording"
        };

        try {
            const ok = await confirm(options);
            if (ok === undefined) {
                console.log("nothing");
                return;
            }
            this.labels.clear();
            if (ok) {
                console.log("stop and upload");
                this.uploading = 10;
                const progress = setInterval(()=>{
                    this.uploading = 100 - (100 - this.uploading) / 10;
                }, 500);
                await this.db.sendDB();
                this.uploading = 100;
                setTimeout(() => {
                    this.uploading = -1
                }, 1000);
                clearInterval(progress);
            }
        } catch (e) {
            console.log("no confirmation");
        }
    }
}

class Labels {
    private _placement: number;
    private _activity: number;
    public phase: number;

    constructor() {
        this.clear();
    }

    get placement(): number{
        return this._placement;
    }

    set placement(p: number){
        this._placement = p;
        this.phase++;
    }

    get activity(): number{
        return this._activity;
    }

    set activity(p: number){
        this._activity = p;
        this.phase++;
    }

    active(): boolean {
        return this.activity > 0 && this.placement > 0;
    }

    clear() {
        this.placement = 0;
        this.activity = 0;
        this.phase = -2;
    }

    stringPl(p = this.placement): string {
        return ['undefined', 'front pocket', 'back pocket', 'front jacket pocket',
            'backpack', 'bag', 'on table', 'in hand', 'against head'][p]
    }

    stringAct(a = this.activity): string {
        return ['undefined', 'sitting', 'walking', 'going upstairs', 'going downstairs', 'bus', 'car'][a]
    }

    getNumeric(): number {
        return this.placement + this.activity * 10;
    }
}

class DataBase {
    public people: Array<any>;

    public constructor(
        private database: any
    ) {
        this.people = [];
    }

    public static async createDB(l: Labels): Promise<DataBase> {
        const db = await new Sqlite("my3.db");
        try {
            await db.execSQL("DROP TABLE sensor_data");
            await db.execSQL("DROP TABLE people");
        } catch (e) {
            console.log("couldn't delete sensor_data - not bad");
        }
        await db.execSQL("CREATE TABLE sensor_data (_id INTEGER PRIMARY KEY AUTOINCREMENT, statusId INTEGER, " +
            "phase INTEGER, sensorName TEXT, accuracy INTEGER, value TEXT, timestamp INTEGER);" +
            "CREATE INDEX idx_1_sensor_data on sensor_data(sensorName,statusId);");
        console.log("created db successfully");
        return new DataBase(db);
    }

    public async insert(sensor: ISensor, labels: Labels) {
        const values = `[${[...sensor.values.values()]}]`;
        return this.database.execSQL("INSERT INTO sensor_data " +
            "(phase, statusID, sensorName, accuracy, value, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            [labels.phase, labels.getNumeric(), sensor.sensor, -1, values, sensor.time]);
    }

    public async close() {
        await this.database.close();
    }

    public async sendDB() {
        let dbFile;
        if (platform.isAndroid) {
            var context = utils.ad.getApplicationContext();
            const dbPath = context.getDatabasePath("my3.db").getAbsolutePath();
            dbFile = await File.fromPath(dbPath).read();
        } else { // (iOS)
            const dbFolder = knownFolders.documents().path;
            const dbPath = dbFolder + "/" + "my3.db";
            dbFile = await File.fromPath(dbPath).read();
        }
        console.log("got file with length :", dbFile.length);
        // const ws = new NativescriptWebSocketAdapter("ws://192.168.100.1:5678");
        const ws = new NativescriptWebSocketAdapter("ws://indie.c4dt.org:5678");
        ws.onOpen(() => {
            console.log("sending", dbFile.length);
            ws.send(dbFile);
        });
        ws.onMessage((msg) => {
            console.log("returned", msg);
            ws.close(1000);
        });
        ws.onError((err) => {
            console.log("error:", err);
        });
        ws.onClose((a, b) => {
            console.log("closed:", a, b);
        })
    }
}

class Collector {
    sensors: Sensor[] = [];

    constructor(private db: DataBase, private labels: Labels) {
    }

    async start() {
        await this.stop();
        for (const c of Sensor.all) {
            const s = Sensor.getSensor(c);
            s.subscribe({
                next: (value) => {
                    this.db.insert(value, this.labels).catch((e) => {
                        console.log("error while inserting data:", e);
                    });
                }
            });
            this.sensors.push(s);
        }
    }

    async stop() {
        for (const s of this.sensors) {
            await s.stop();
        }
        this.sensors.splice(0);
    }

    isRunning(): boolean {
        return this.sensors.length > 0;
    }
}

interface ISensor {
    sensor: string;
    values: Map<string, number>;
    time: number;
}

class Sensor extends ReplaySubject<ISensor> {
    static all = [SENSOR_ACCELEROMETER, SENSOR_PRESSURE, SENSOR_GYROSCOPE, SENSOR_LIGHT, SENSOR_STEP];
    static delay: SensorDelay = "game";

    constructor(private sensor: string, newValues: ReplaySubject<Map<string, number>>) {
        super(1);
        newValues.subscribe({
            next: (values) => {
                this.next({sensor, values, time: Date.now()})
            }
        })
    }

    static getSensor(type: string): Sensor | undefined {
        const rs = new ReplaySubject<Map<string, number>>(1);
        try {
            switch (type) {
                case SENSOR_ACCELEROMETER:
                    startAccelerometerUpdates((ad) => {
                        rs.next(new Map([
                            ["x", ad.x],
                            ["y", ad.y],
                            ["z", ad.z],
                        ]))
                    }, {sensorDelay: Sensor.delay});
                    break;
                case SENSOR_PRESSURE:
                    startPressureUpdates((pressure) => {
                        rs.next(new Map([["mbar", pressure.mbar]]));
                    }, {sensorDelay: Sensor.delay});
                    break;
                case SENSOR_GYROSCOPE:
                    startGyroscopeUpdates((gyroscope) => {
                        rs.next(new Map([
                                ["x", gyroscope.x],
                                ["y", gyroscope.y],
                                ["z", gyroscope.z]
                            ]
                        ));
                    }, {sensorDelay: Sensor.delay});
                    break;
                case SENSOR_LIGHT:
                    startLightUpdates((lux) => {
                        rs.next(new Map([["lux", lux.lux]]));
                    }, {sensorDelay: Sensor.delay});
                    break;
                case SENSOR_STEP:
                    startStepUpdates((step) => {
                        rs.next(new Map([["counter", step.counter]]));
                    }, {sensorDelay: Sensor.delay});
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

    stop() {
        switch (this.sensor) {
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
