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
import {Log} from "~/lib/log";
import {CollectorService} from "~/app/collector.service";
import Timeout = NodeJS.Timeout;

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
    public zeroToFive = [...Array(6).keys()];
    public zeroToSeven = [...Array(8).keys()];
    public zeroToEight = [...Array(9).keys()];
    public uploading = -1;
    public currentSpeed: string;
    public version: string;
    public loaded = false;
    private progressUpdate: Timeout;

    constructor(
        private routerExtensions: RouterExtensions,
        private appsync: AppSyncService,
        private data: DataService,
        private collector: CollectorService,
    ) {
        this.version = appsync.getVersion();
    }

    get recording(): number {
        return this.collector.recording;
    }

    get speed(): string {
        const s = this.data.getKV("speed");
        this.currentSpeed = "Recording speed is: " + s;
        return s;
    }

    set speed(sp: string) {
        this.data.setKV("speed", sp);
        Sensor.delay = ["normal", "ui", "game", "fastest"][MeasureComponent.speeds.findIndex(s => s === sp)] as SensorDelay;
        Log.lvl2("speed is:", this.speed);
    }

    get labels(): Labels {
        return this.collector.labels;
    }

    get db(): DataBase {
        return this.collector.db;
    }

    setPlacement(p: number) {
        this.labels.setPlacement(p);
        if (this.recording === 0 && this.labels.active) {
            this.start();
        }
        Log.print("navigating to insomnia");
        return this.routerExtensions.navigateByUrl("/insomnia");
    }

    setActivity(a: number) {
        this.labels.setActivity(a);
        if (this.recording === 0 && this.labels.active) {
            return this.start();
        }
    }

    async ngOnInit() {
        this.appsync.block = false;
        if (this.speed === undefined || this.appsync.getVersion().startsWith("0.4.2")) {
            this.speed = MeasureComponent.speeds[3];
        }
        this.loaded = true;
        if (debugOpt.showDT) {
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
        this.appsync.block = true;
        if (!this.labels.active || this.recording === 2) {
            return;
        }
        await this.collector.start();
        return this.routerExtensions.navigateByUrl("/insomnia");
    }

    async pause() {
        return this.collector.pause();
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
                return;
            }
            this.labels.clear();
            await this.collector.stop();
            this.collector.rowString = "";
            if (ok) {
                console.log("stop and upload");
                this.uploading = 10;
                this.progressUpdate = setInterval(() => {
                    this.uploading += (100 - this.uploading) / 10;
                }, 250);
                let total = -1;
                try {
                    total = await this.db.uploadDB();
                    if (this.uploading === -1) {
                        Log.warn("upload aborted");
                        return;
                    }
                    clearInterval(this.progressUpdate);
                } catch (e) {
                    clearInterval(this.progressUpdate);
                    this.uploading = -1;
                    await alert("Couldn't upload data: " + e.toString());
                }
                if (this.uploading > 0) {
                    this.uploading = 100;
                    const totStr = total > 0 ? ` Total available datasets on remote server: ${total}` : "";
                    await alert({
                        message: `Successfully uploaded data.` + totStr,
                        title: "Success",
                        okButtonText: "Go on rockin'"
                    });
                    this.uploading = -1;
                    await this.data.incTime(0, this.collector.time);
                }
            }
            this.collector.time = 0;
            await this.db.clean();
        } catch (e) {
            Log.lvl2("no confirmation:", e);
        }
    }

    async abortUpload() {
        clearInterval(this.progressUpdate);
        await alert("Upload cancelled");
        this.uploading = -1;
        this.collector.time = 0;
        await this.db.clean();
    }

    async goMain() {
        if (this.recording > 0) {
            return alert({
                title: "Still Recording",
                message: "Please stop recording before going to the main page"
            })
        } else {
            await this.data.setKV("again", "false");
            return this.routerExtensions.navigateByUrl("/");
        }
    }
}
