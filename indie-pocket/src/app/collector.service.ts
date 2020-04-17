import {Injectable} from '@angular/core';
import {Sensor} from "~/lib/sensors/sensor";
import {DataBase} from "~/lib/database";
import {Labels} from "~/app/measure/labels";
import {DataService} from "~/app/data.service";

@Injectable({
    providedIn: 'root'
})
export class CollectorService {
    sensors: Sensor[] = [];
    gamification: any;
    time: number = 0;
    public labels: Labels;
    private db: DataBase;
    private data: DataService;
    public times: string;
    public rows: string;

    constructor() {
    }

    private _recording = 0;

    get recording(): number {
        return this._recording;
    }

    async init(data: DataService, version: string) {
        this.data = data;
        this.labels = new Labels(data);
        this.db = await DataBase.createDB(this.labels, await this.data.getKV("iid"), version);
        setInterval(async () => {
            const tt = this.data.getTime(0);
            const rows = await this.db.count();
            this.times = `Uploaded time: ${Math.floor(tt / 60)}' ${tt % 60}''`;
            const rec = this.time;
            if (rec > 0 || this.recording > 0) {
                this.times += ` -- Recording time: ${Math.floor(rec / 60)}' ${rec % 60}''`;
            }
            this.rows = rows === 0 ? "" : `Recording rows: ${rows}`;
            if (this.db.flushTime > 0) {
                this.rows += ` -- flush: ${this.db.flushTime}ms`
            }
            this.labels.update();
        }, 1000);
    }

    async start() {
        if (this._recording === 2) {
            return;
        }
        await this.stop();
        this._recording = 2;
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
                if (this.labels.placement === 0) {
                    console.log("something is wrong");
                }
                this.data.incTime(this.labels.placement);
                this.data.incTime(this.labels.activity * 10);
            }
        }, 1000)
    }

    async pause(){
        switch (this.recording) {
            case 0:
                return;
            case 1:
                return this.start();
            default:
                this.labels.phase++;
                await this.stop();
                this._recording = 1;
        }
    }

    async stop() {
        if (this._recording === 0) {
            return;
        }
        this._recording = 0;
        for (const s of this.sensors) {
            await s.stop();
        }
        this.sensors.splice(0);
        clearInterval(this.gamification);
    }
}
