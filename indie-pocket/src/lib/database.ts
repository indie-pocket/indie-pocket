import {device} from "@nativescript/core/platform";
import {debug, debugOpt, serverURL} from "~/lib/global";
import {ISensor} from "~/lib/sensors/sensor";
import * as platform from "tns-core-modules/platform";
import * as utils from "tns-core-modules/utils/utils";
import {File, Folder, knownFolders} from "@nativescript/core";
import * as Sqlite from "nativescript-sqlite";
import {Log} from "~/lib/log";
import {Labels} from "~/lib/labels";
// tslint:disable-next-line
const WS = require("nativescript-websockets");

/**
 * Database holds all sensor readings in an sqlite database and uploads it to the servers. To avoid
 * too many interruption while writing to the db, it keeps a buffer.
 *
 * @TODO - check if the buffer is still needed. We added it because there was too much jitter. But the final reason
 * for the jitter was not using the timestamps in the sensor-readings. So probably the buffer could be removed.
 */
export class DataBase {
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

    public static async createDB(l: Labels, iid: string, version: string): Promise<DataBase> {
        const db = await new Sqlite("my3.db");
        try {
            await db.execSQL("DROP TABLE sensor_data");
            await db.execSQL("DROP TABLE iid");
        } catch (e) {
            Log.lvl2("couldn't delete sensor_data - not bad");
        }
        Log.lvl2("setting iid to", iid);
        try {
            await db.execSQL(`CREATE TABLE IF NOT EXISTS iid (id TEXT UNIQUE, version TEXT, device TEXT);`);
            const deviceString = `${device.os} ${device.osVersion} - ${device.deviceType} - ${device.manufacturer} ${device.model}`;
            await db.execSQL(`REPLACE INTO iid (id, version, device) VALUES ('${iid}', '${version}', '${deviceString}');`);
        } catch (e) {
            Log.lvl2("error in iid:", e);
        }
        Log.lvl2("iid is:", await db.get("SELECT * FROM iid;"));
        try {
            await db.execSQL("CREATE TABLE sensor_data (_id INTEGER PRIMARY KEY AUTOINCREMENT, statusId INTEGER, " +
                "phase INTEGER, sensorName TEXT, accuracy INTEGER, value TEXT, timestamp INTEGER);" +
                "CREATE INDEX idx_1_sensor_data on sensor_data(sensorName,statusId);");
            Log.lvl2("created db successfully");
        } catch (e) {
            Log.lvl2("couldn't create table:", e);
        }
        return new DataBase(db, l);
    }

    public async insert(sensor: ISensor, labels: Labels) {
        const values = `[${[...sensor.values.values()]}]`;
        const row = `(${labels.phase}, ${labels.getNumeric()}, '${sensor.sensor}', -1, '${values}', ${sensor.time})`;
        this.buffer.push(row);
        if (debugOpt.showRecordings) {
            Log.lvl1(row);
        }
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
        Log.lvl2("flushed DB in", this.flushTime / 1000);
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

    public async uploadDB(): Promise<number> {
        await this.flush();
        Log.lvl2("counter is:", await this.count());
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
                Log.lvl2(file.name);
            });
            const dbPath = dbFolder + "/" + "my3.db";
            dbFile = await File.fromPath(dbPath).read();
        }
        Log.lvl2("got file with length :", dbFile.length);

        // The happy path of this is:
        // - ws.open()
        // - on("open" - sends the message and waits for the reply
        // - on("message" - closes the connection
        // if something goes wrong, on("error" is called.
        return new Promise((resolve, reject) => {
            Log.lvl2("Connecting to", serverURL);
            const ws = new WS(serverURL, {timeout: 1000});
            // to prevent the browser to use blob
            ws.binaryType = "arraybuffer";
            ws.open();
            ws.on("open", () => {
                Log.lvl2("sending", dbFile.length);
                ws.send(dbFile);
            });
            ws.on("message", (_, msg) => {
                Log.lvl2("returned", msg);
                ws.close(1000);
                if (msg.toString().startsWith("entries:")) {
                    setTimeout(() => resolve(parseInt(msg.toString().slice(8))),
                        debug ? 2000 : 0);
                } else {
                    resolve(-1);
                }
            });
            ws.on("error", (_, err) => {
                Log.lvl2("error:", err);
                reject(err);
            });
        });
    }
}
