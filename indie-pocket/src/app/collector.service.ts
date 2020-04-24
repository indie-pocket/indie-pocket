import {Injectable} from '@angular/core';
import {Sensor} from "~/lib/sensors/sensor";
import {DataBase} from "~/lib/database";
import {DataService} from "~/app/data.service";
import {Log} from "~/lib/log";
import {Labels} from "~/lib/labels";
import {EventData, Switch} from "@nativescript/core";

@Injectable({
    providedIn: 'root'
})
export class CollectorService {
    sensors: Sensor[] = [];
    gamification: any;
    time: number = 0;
    public labels: Labels;
    public db: DataBase;
    public timeString: string;
    public recordedString = "";
    public rowString: string;
    public recording = 0;
    public flash: boolean;
    public lessClicks = false;
    public lock = false;
    private data: DataService;

    constructor() {
    }

    async init(data: DataService, version: string) {
        this.data = data;
        this.labels = new Labels(data);
        this.db = await DataBase.createDB(this.labels, await this.data.getKV("iid"), version);
        this.lessClicks = this.data.getKV("lessClicks") !== "false";

        setInterval(async () => {
            const tt = this.data.getTime(0);
            const rows = await this.db.count();
            this.timeString = `Uploaded: ${Math.floor(tt / 60)}' ${tt % 60}''`;
            const rec = this.time;
            this.recordedString = "";
            if (rec > 0 || this.recording > 0) {
                this.recordedString += `Recording: ${Math.floor(rec / 60)}' ${rec % 60}''`;
            }
            this.rowString = rows === 0 ? "" : `Recording rows: ${rows}`;
            if (this.db.flushTime > 0) {
                this.rowString += `\nflush: ${this.db.flushTime}ms`
            }
            this.labels.update();
            if (this.recording === 2){
                this.flash = !this.flash;
            }
        }, 1000);
    }

    async setLessClicks(e: EventData){
        const sw = <Switch>e.object;
        const lc = sw.checked;
        if (this.recording === 0) {
            this.lessClicks = lc;
            return this.data.setKV("lessClicks", lc ? "true" : "false");
        } else {
            sw.checked = this.lessClicks;
        }
    }

    async start() {
        if (this.recording === 2) {
            return;
        }
        await this.stop();
        this.recording = 2;
        for (const c of Sensor.all) {
            const s = Sensor.getSensor(c);
            s.subscribe({
                next: (value) => {
                    this.db.insert(value, this.labels).catch((e) => {
                        Log.error("error while inserting data:", e);
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
                if (this.labels.placement === 0) {
                    Log.error("something is wrong");
                }
                this.data.incTime(this.labels.placement);
                if (this.labels.activity > 0) {
                    this.data.incTime(this.labels.activity * 10);
                }
            }
        }, 1000)
    }

    async pause() {
        switch (this.recording) {
            case 0:
                return;
            case 1:
                this.flash = true;
                return this.start();
            default:
                this.labels.phase++;
                await this.stop();
                this.recording = 1;
                this.flash = true;
        }
    }

    async stop() {
        this.flash = false;
        if (this.recording === 0) {
            return;
        }
        this.recording = 0;
        for (const s of this.sensors) {
            await s.stop();
        }
        this.sensors.splice(0);
        clearInterval(this.gamification);
    }
}
