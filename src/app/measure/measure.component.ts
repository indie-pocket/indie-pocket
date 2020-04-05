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
import {action, confirm} from "tns-core-modules/ui/dialogs";
import {DataService} from "~/app/data.service";
import {debugPoints, serverURL, Version} from "~/lib_acc/global";

@Component({
    selector: 'ns-measure',
    templateUrl: './measure.component.html',
    styleUrls: ['./measure.component.css']
})
export class MeasureComponent implements OnInit {
    public static speeds = ["Slow", "Medium", "Fast", "Crazy"];
    public labels: Labels;
    public zeroToFive = [...Array(6).keys()];
    public zeroToSeven = [...Array(8).keys()];
    public uploading = -1;
    public totalTime: string;
    public currentSpeed: string;
    public version = Version;
    private db: DataBase;
    private collector: Collector;
    public loaded = false;
    public recording = false;

    constructor(private routerExtensions: RouterExtensions,
                private data: DataService) {
    }

    get speed(): string {
        const s = this.data.getKV("speed");
        this.currentSpeed = "Recording speed is: " + s;
        return s;
    }

    set speed(sp: string) {
        this.data.setKV("speed", sp);
        Sensor.delay = ["normal", "ui", "game", "fastest"][MeasureComponent.speeds.findIndex(s => s === sp)] as SensorDelay;
        console.log("speed is:", this.speed);
    }

    async updateRecording() {
        const a = this.labels.active();
        if (this.collector) {
            if (a && !this.collector.isRunning()) {
                await this.collector.start()
            } else if (!a && this.collector.isRunning()) {
                console.log("stopping collector");
                await this.collector.stop();
            }
        }
        this.recording = a;
    }

    setPlacement(p: number){
        this.labels.setPlacement(p);
        this.updateRecording();
    }

    setActivity(a: number){
        this.labels.setActivity(a);
        this.updateRecording();
    }

    async ngOnInit() {
        this.labels = new Labels(this.data);
        if (this.data.getKV("iid") === undefined) {
            const r1 = Math.floor(1e9 * Math.random());
            const r2 = Math.floor(1e9 * Math.random());
            await this.data.setKV("iid", `${r1}${r2}`);
        }
        this.db = await DataBase.createDB(this.labels, await this.data.getKV("iid"));
        this.collector = new Collector(this.db, this.labels, this.data);
        if (this.speed === undefined) {
            this.speed = MeasureComponent.speeds[1];
        }
        setInterval(async () => {
            const tt = this.data.getTime(0);
            const rows = await this.db.count();
            this.totalTime = `Total time: ${Math.floor(tt / 60)}' ${tt % 60}''`;
            if (rows > 0) {
                this.totalTime += `-- recording: ${rows} rows`;
            }
            if (this.db.flushTime > 0){
                this.totalTime += ` -- flush: ${this.db.flushTime}ms`
            }
            this.labels.update();
        }, 1000);
        console.log("loaded");
        this.loaded = true;
        if (debugPoints) {
            console.log("DEBUGGING POINTS");
            this.setPlacement(1);
            this.setActivity(1);
            setTimeout(() => {
                this.labels.clear();
                this.updateRecording();
                this.db.clean();
            }, 1000);
        }
    }

    async setSpeed() {
        const ret = await action("Choose speed", "Cancel", MeasureComponent.speeds);
        if (ret && ret !== "Cancel") {
            this.speed = ret;
        }
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
                const progress = setInterval(() => {
                    this.uploading = 100 - (100 - this.uploading) / 10;
                }, 500);
                await this.db.sendDB();
                this.uploading = 100;
                setTimeout(() => {
                    this.uploading = -1
                }, 1000);
                clearInterval(progress);
            }
            await this.db.clean();
        } catch (e) {
            console.log("no confirmation:", e);
        }
        this.updateRecording();
    }

    async goMain() {
        await this.data.setKV("again", "false");
        this.routerExtensions.navigateByUrl("/");
    }
}

class Labels {
    public phase: number;
    public placementClasses: string[] = ["", "", "", "", "", "", "", "", "", ""];
    public placementLabels = ['undefined', 'front pocket', 'back pocket', 'front jacket pocket',
        'backpack', 'bag', 'on table', 'in hand', 'against head'];
    public activityClasses: string[] = ["", "", "", "", "", "", "", "", "", ""];
    public activityLabels = ['undefined', 'sitting', 'walking', 'going upstairs', 'going downstairs', 'bus', 'car'];
    public placement: number;
    public activity: number;

    constructor(private data: DataService) {
        this.clear();
        this.update();
    }

    setPlacement(p: number) {
        this.placement = p;
        this.phase++;
    }

    setActivity(p: number) {
        this.activity = p;
        this.phase++;
    }

    update() {
        for (let p = 1; p <= 8; p++) {
            const t = this.data.getTime(p);
            this.placementClasses[p] = this.color(t);
        }

        for (let a = 1; a <= 6; a++) {
            const t = this.data.getTime(a * 10);
            this.activityClasses[a] = this.color(t);
        }
    }

    color(time: number): string {
        if (time < 60) {
            return "button-never";
        } else if (time < 120) {
            return "button-medium";
        }
        return "button-ok";
    }

    active(): boolean {
        return this.activity > 0 && this.placement > 0;
    }

    clear() {
        this.placement = 0;
        this.activity = 0;
        this.phase = -2;
    }

    getNumeric(): number {
        return this.placement + this.activity * 10;
    }
}

class DataBase {
    static bufferSize = 16384;
    public people: Array<any>;
    private buffer: string[] = [];
    public flushTime = 0;

    public constructor(
        private database: any,
        public labels: Labels
    ) {
        this.people = [];
    }

    public static async createDB(l: Labels, iid: string): Promise<DataBase> {
        const db = await new Sqlite("my3.db");
        try {
            await db.execSQL("DROP TABLE sensor_data");
            await db.execSQL("DROP TABLE iid");
        } catch (e) {
            console.log("couldn't delete sensor_data - not bad");
        }
        console.log("setting iid to", iid);
        try {
            await db.execSQL(`CREATE TABLE IF NOT EXISTS iid (id TEXT UNIQUE, version TEXT);`);
            await db.execSQL(`REPLACE INTO iid (id, version) VALUES ('${iid}', '${Version}');`);
        } catch (e) {
            console.log("error in iid:", e);
        }
        console.log("iid is:", await db.get("SELECT * FROM iid;"));
        await db.execSQL("CREATE TABLE sensor_data (_id INTEGER PRIMARY KEY AUTOINCREMENT, statusId INTEGER, " +
            "phase INTEGER, sensorName TEXT, accuracy INTEGER, value TEXT, timestamp INTEGER);" +
            "CREATE INDEX idx_1_sensor_data on sensor_data(sensorName,statusId);");
        console.log("created db successfully");
        return new DataBase(db, l);
    }

    public async insert(sensor: ISensor, labels: Labels) {
        const values = `[${[...sensor.values.values()]}]`;
        this.buffer.push(`(${labels.phase}, ${labels.getNumeric()}, '${sensor.sensor}', -1, '${values}', ${sensor.time})`);
        if (this.buffer.length > DataBase.bufferSize) {
            await this.flush();
        }
    }

    public async flush(){
        const now = Date.now();
        await this.database.execSQL("INSERT INTO sensor_data " +
            "(phase, statusID, sensorName, accuracy, value, timestamp) VALUES " +
            this.buffer.join(",") + ";");
        this.buffer.splice(0);
        this.flushTime = Date.now() - now;
        console.log("flushed DB in", this.flushTime / 1000);
    }

    public async close() {
        await this.database.close();
    }

    public async count(): Promise<number> {
        return (await this.database.get("SELECT COUNT(*) FROM sensor_data;"))[0] + this.buffer.length;
    }

    public async clean() {
        this.buffer.splice(0);
        await this.database.execSQL("DELETE FROM sensor_data;");
        this.flushTime = 0;
    }

    public async sendDB() {
        await this.flush();
        console.log("counter is:", await this.count());
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
        const ws = new NativescriptWebSocketAdapter(serverURL);
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
    gamification: any;

    constructor(private db: DataBase, private labels: Labels, private data: DataService) {
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
        if (this.gamification) {
            clearInterval(this.gamification);
        }
        this.gamification = setInterval(() => {
            console.log("incinterval", this.data.getTime(0));
            this.data.incTime(0);
            this.data.incTime(this.labels.placement);
            this.data.incTime(this.labels.activity * 10);
        }, 1000)
    }

    async stop() {
        for (const s of this.sensors) {
            await s.stop();
        }
        this.sensors.splice(0);
        clearInterval(this.gamification);
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
            // rs.next(new Map([["not available", e]]));
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
