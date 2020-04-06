/// <reference path="../../../node_modules/tns-platform-declarations/android.d.ts" /> Needed for autocompletion and
// compilation.

import {Component, OnInit} from '@angular/core';
import {RouterExtensions} from "nativescript-angular/router";
import * as platform from "tns-core-modules/platform"
import * as utils from "tns-core-modules/utils/utils"
import {File, Folder, knownFolders} from "tns-core-modules/file-system"
import * as Sqlite from "nativescript-sqlite";
import {NativescriptWebSocketAdapter} from "~/lib/websocket";
import {ReplaySubject} from "rxjs";
import {
    SENSOR_ACCELEROMETER,
    SENSOR_GYROSCOPE,
    SENSOR_LIGHT,
    SENSOR_PRESSURE,
    SENSOR_STEP,
    SensorDelay
} from "~/lib/messages";
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
} from "~/lib";
import {action, confirm} from "tns-core-modules/ui/dialogs";
import {DataService} from "~/app/data.service";
import {debugPoints, gameButtons, serverURL, Version} from "~/lib/global";
import { isAndroid, isIOS, device, screen } from "tns-core-modules/platform";

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
    public times: string;
    public rows: string;
    public currentSpeed: string;
    public version = Version;
    public loaded = false;
    public recording = 0;
    private db: DataBase;
    private collector: Collector;

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

    setPlacement(p: number) {
        this.labels.setPlacement(p);
        if (this.recording === 0 && this.labels.active){
            this.start();
        }
    }

    setActivity(a: number) {
        this.labels.setActivity(a);
        if (this.recording === 0 && this.labels.active){
            this.start();
        }
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
            this.times = `Uploaded time: ${Math.floor(tt / 60)}' ${tt % 60}''`;
            const rec = this.collector.time;
            if (rec > 0 || this.recording > 0) {
                this.times += ` -- Recording time: ${Math.floor(rec / 60)}' ${rec % 60}''`;
            }
            if (rows > 0) {
                this.rows = `Recording rows: ${rows}`;
            }
            if (this.db.flushTime > 0) {
                this.rows += ` -- flush: ${this.db.flushTime}ms`
            }
            this.labels.update();
        }, 1000);
        console.log("loaded");
        this.loaded = true;
        if (debugPoints) {
            console.log("DEBUGGING POINTS");
            this.labels.setPlacement(1);
            this.labels.setActivity(1);
            await this.collector.start();
            setTimeout(() => {
                this.labels.clear();
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

    async start() {
        if (!this.labels.active || this.recording === 2) {
            return;
        }
        this.recording = 2;
        await this.collector.start();
    }

    async pause() {
        switch(this.recording){
            case 0:
                return;
            case 1:
                return this.start();
            default:
                this.labels.phase++;
                this.recording = 1;
                return this.collector.stop();
        }
    }

    async stop() {
        if (this.recording === 0) {
            return;
        }
        let options = {
            title: "Finish Recording",
            message: "Stop recording and upload data to server?",
            okButtonText: "Stop and upload",
            cancelButtonText: "Stop and discard",
            neutralButtonText: "Continue Recording"
        };

        try {
            const ok = await confirm(options);
            console.log("confirm is", ok);
            if (ok === undefined) {
                console.log("nothing");
                return;
            }
            this.labels.clear();
            await this.collector.stop();
            this.recording = 0;
            this.rows = "";
            if (ok) {
                console.log("stop and upload");
                this.uploading = 10;
                const progress = setInterval(() => {
                    this.uploading = 100 - (100 - this.uploading) / 10;
                }, 500);
                await this.db.uploadDB();
                this.uploading = 100;
                setTimeout(() => {
                    this.uploading = -1
                }, 1000);
                clearInterval(progress);
                await this.data.incTime(0, this.collector.time);
            }
            this.collector.time = 0;
            await this.db.clean();
        } catch (e) {
            console.log("no confirmation:", e);
        }
    }

    async goMain() {
        await this.data.setKV("again", "false");
        this.routerExtensions.navigateByUrl("/");
    }
}

class Labels {
    public phase: number;
    public placementClasses: string[] = ["", "", "", "", "", "", "", "", "", ""];
    public placementLabels = ['undefined',
        'on table', 'in hand', 'against head',
        'front pocket', 'back pocket', 'front jacket pkt',
        'handbag', 'backpack'
    ];
    public activityClasses: string[] = ["", "", "", "", "", "", "", "", "", ""];
    public activityLabels = ['undefined', 'walking', 'standing', 'sitting',
        'going upstairs', 'going downstairs', 'transports'];
    public placement: number;
    public activity: number;
    public active: boolean;

    constructor(private data: DataService) {
        this.clear();
        this.update();
    }

    setPlacement(p: number) {
        this.placement = p;
        this.phase++;
        this.update();
    }

    setActivity(p: number) {
        this.activity = p;
        this.phase++;
        this.update();
    }

    update() {
        for (let p = 1; p <= 8; p++) {
            const t = this.data.getTime(p);
            this.placementClasses[p] = this.color(t);
        }
        this.placementClasses[this.placement] += " chosen";

        for (let a = 1; a <= 6; a++) {
            const t = this.data.getTime(a * 10);
            this.activityClasses[a] = this.color(t);
        }
        this.activityClasses[this.activity] += " chosen";

        this.active = this.activity > 0 && this.placement > 0;
    }

    color(time: number): string {
        if (time < gameButtons) {
            return "button-never";
        } else if (time < 2 * gameButtons) {
            return "button-medium";
        }
        return "button-ok";
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
    static bufferSize = 32768;
    public people: Array<any>;
    public flushTime = 0;
    private buffer: string[] = [];

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
            await db.execSQL(`CREATE TABLE IF NOT EXISTS iid (id TEXT UNIQUE, version TEXT, device TEXT);`);
            let deviceString = `${device.os} ${device.osVersion} - ${device.deviceType} - ${device.manufacturer} ${device.model}`;
            await db.execSQL(`REPLACE INTO iid (id, version, device) VALUES ('${iid}', '${Version}', '${deviceString}');`);
        } catch (e) {
            console.log("error in iid:", e);
        }
        console.log("iid is:", await db.get("SELECT * FROM iid;"));
        try {
            await db.execSQL("CREATE TABLE sensor_data (_id INTEGER PRIMARY KEY AUTOINCREMENT, statusId INTEGER, " +
                "phase INTEGER, sensorName TEXT, accuracy INTEGER, value TEXT, timestamp INTEGER);" +
                "CREATE INDEX idx_1_sensor_data on sensor_data(sensorName,statusId);");
            console.log("created db successfully");
        } catch(e){
            console.log("couldn't create table:", e);
        }
        return new DataBase(db, l);
    }

    public async insert(sensor: ISensor, labels: Labels) {
        const values = `[${[...sensor.values.values()]}]`;
        this.buffer.push(`(${labels.phase}, ${labels.getNumeric()}, '${sensor.sensor}', -1, '${values}', ${sensor.time})`);
        if (this.buffer.length > DataBase.bufferSize) {
            await this.flush();
        }
    }

    public async flush() {
        const now = Date.now();
        await this.database.execSQL("INSERT INTO sensor_data " +
            "(phase, statusID, sensorName, accuracy, value, timestamp) VALUES " +
            this.buffer.join(",") + ";");
        this.buffer.splice(0);
        this.flushTime = Date.now() - now;
        console.log("flushed DB in", this.flushTime / 1000);
        this.labels.phase++;
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

    public async uploadDB() {
        await this.flush();
        console.log("counter is:", await this.count());
        let dbFile;
        if (platform.isAndroid) {
            var context = utils.ad.getApplicationContext();
            const dbPath = context.getDatabasePath("my3.db").getAbsolutePath();
            dbFile = await File.fromPath(dbPath).read();
        } else { // (iOS)
            const dbFolder = knownFolders.documents().path;
            const f = Folder.fromPath(dbFolder);
            const files = await f.getEntities();
            files.forEach(file => {
                console.log(file.name);
            });
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
    time: number = 0;

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
            this.time++;
            if (this.labels.active) {
                if (this.labels.placement === 0 || this.labels.activity === 0) {
                    console.log("something is wrong");
                }
                this.data.incTime(this.labels.placement);
                this.data.incTime(this.labels.activity * 10);
            }
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
    private latest = Date.now();

    constructor(private sensor: string, newValues: ReplaySubject<ISensor>) {
        super(1);
        newValues.subscribe({
            next: (values) => {
                if (debugPoints && values.sensor === SENSOR_ACCELEROMETER) {
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
