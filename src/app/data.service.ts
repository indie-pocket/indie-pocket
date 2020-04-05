import {Injectable} from '@angular/core';
import * as Sqlite from "nativescript-sqlite";

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private kv = new Map<string, string>();
    private time = new Map<number, number>();
    private db: any;

    constructor() {
    }

    async connect() {
        this.db = await new Sqlite("main_data.db");
        try {
            // await this.db.execSQL("DROP TABLE time;");
            // await this.db.execSQL("DROP TABLE keyvalue;");
        } catch (e) {
            console.log("couldn't init tables:", e)
        }
        await this.db.execSQL("CREATE TABLE IF NOT EXISTS time (statusId INTEGER UNIQUE, timeSpent INTEGER UNIQUE);");
        await this.db.execSQL("CREATE TABLE IF NOT EXISTS keyvalue (key TEXT UNIQUE, value TEXT);");
        const times = await this.db.all("SELECT * FROM time;");
        times.forEach(t => {
            console.log("got time:", t);
            this.time.set(t[0], t[1]);
        });
        const kvs = await this.db.all("SELECT * FROM keyvalue;");
        kvs.forEach(kv => {
            console.log("got kv:", kv);
            this.kv.set(kv[0], kv[1]);
        });
    }

    async setKV(key: string, value: string) {
        this.kv.set(key, value);
        return this.db.execSQL("REPLACE INTO keyvalue(key, value) VALUES (?, ?);",
            [key, value]);
    }

    getKV(key: string): string {
        return this.kv.get(key);
    }

    async incTime(statusID: number) {
        const old = this.time.get(statusID) || 0;
        this.time.set(statusID, old + 1);
        return this.db.execSQL("REPLACE INTO time(statusId, timeSpent) VALUES (?, ?);",
            [statusID, old + 1]);
    }

    getTime(statusID: number): number {
        return this.time.get(statusID) || 0;
    }
}
