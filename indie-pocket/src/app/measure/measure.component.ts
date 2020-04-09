import {Component, OnInit} from '@angular/core';
import {RouterExtensions} from "nativescript-angular/router";
import {SensorDelay} from "~/lib/sensors/messages";
import {action, alert, confirm} from "tns-core-modules/ui/dialogs";
import {DataService} from "~/app/data.service";
import {debugOpt} from "~/lib/global";
import {AppSyncService} from "~/app/app-sync.service";
import {Sensor} from "~/lib/sensors/sensor";
import {Labels} from "~/app/measure/labels";
import {DataBase} from "~/lib/database";
import {isIOS} from "tns-core-modules/platform";
import Timeout = NodeJS.Timeout;
import {Log} from "~/lib/log";

/**
 * MeasureComponent is the main component of the app. It allows the user to chose her
 * placement and activity.
 */
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
    public version: string;
    public loaded = false;
    public recording = 0;
    private db: DataBase;
    private collector: Collector;
    private progressUpdate: Timeout;

    constructor(
        private routerExtensions: RouterExtensions,
        private appsync: AppSyncService,
        private data: DataService) {
        this.version = appsync.getVersion();
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
        if (this.recording === 0 && this.labels.active) {
            this.start();
        }
    }

    setActivity(a: number) {
        this.labels.setActivity(a);
        if (this.recording === 0 && this.labels.active) {
            this.start();
        }
    }

    async ngOnInit() {
        this.appsync.block = false;
        this.labels = new Labels(this.data);
        this.db = await DataBase.createDB(this.labels, await this.data.getKV("iid"), this.appsync.getVersion());
        this.collector = new Collector(this.db, this.labels, this.data);
        if (this.speed === undefined || this.appsync.getVersion().startsWith("0.4.2")) {
            this.speed = MeasureComponent.speeds[3];
        }
        setInterval(async () => {
            const tt = this.data.getTime(0);
            const rows = await this.db.count();
            this.times = `Uploaded time: ${Math.floor(tt / 60)}' ${tt % 60}''`;
            const rec = this.collector.time;
            if (rec > 0 || this.recording > 0) {
                this.times += ` -- Recording time: ${Math.floor(rec / 60)}' ${rec % 60}''`;
            }
            this.rows = rows === 0 ? "" : `Recording rows: ${rows}`;
            if (this.db.flushTime > 0) {
                this.rows += ` -- flush: ${this.db.flushTime}ms`
            }
            this.labels.update();
        }, 1000);
        console.log("loaded");
        this.loaded = true;
        if (debugOpt.debugPoints) {
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
        if (this.recording === 0 && isIOS){
            await confirm("Please keep the app in the Foreground! iOS doesn't allow to gather data if the " +
                "app is in the background or the phone is locked.")
        }
        this.appsync.block = true;
        if (!this.labels.active || this.recording === 2) {
            return;
        }
        this.recording = 2;
        await this.collector.start();
    }

    async pause() {
        switch (this.recording) {
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
        this.appsync.block = false;
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
                this.progressUpdate = setInterval(() => {
                    this.uploading += (100 - this.uploading) / 10;
                }, 250);
                let total = -1;
                try {
                    total = await this.db.uploadDB();
                    if (this.uploading === -1){
                        Log.warn("upload aborted");
                        return;
                    }
                    clearInterval(this.progressUpdate);
                } catch (e) {
                    clearInterval(this.progressUpdate);
                    this.uploading = -1;
                    await alert("Couldn't upload data: " + e.toString());
                }
                if (this.uploading > 0){
                    this.uploading = 100;
                    const totStr = total > 0 ? ` Total available datasets on remote server: ${total}` : "";
                    await confirm(`Successfully uploaded data.` + totStr);
                    this.uploading = -1;
                    await this.data.incTime(0, this.collector.time);
                }
            }
            this.collector.time = 0;
            await this.db.clean();
        } catch (e) {
            console.log("no confirmation:", e);
        }
    }

    async abortUpload(){
        clearInterval(this.progressUpdate);
        await confirm("Upload cancelled");
        this.uploading = -1;
    }

    async goMain() {
        await this.data.setKV("again", "false");
        this.routerExtensions.navigateByUrl("/");
    }
}

/**
 * Collector starts all sensors and keeps a reference to them, so that they can be stopped afterwards.
 * In addition, it handles the gamification by increasing the time of the different buttons.
 */
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
}

