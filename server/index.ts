import {Server} from "ws";
import {readdirSync, writeFileSync} from "fs";

const wss = new Server({port: 5678});

console.log("started server on port", 5678);

wss.on('connection', (ws) => {
    console.log("connected");
    ws.on('message', (message) => {
        console.log('received: %s', Buffer.from(message).length);
        try {
            switch (message.slice(0, 15).toString()) {
                case "SQLite format 3":
                    const dbName = `data/sensors-${new Date().getTime()}.db`;
                    writeFileSync(dbName, message);
                    console.log("successfully written file", dbName);
                    break;
                case "User message   ":
                    const msgName = `data/message-${new Date().getTime()}.txt`;
                    writeFileSync(msgName, message + "\n");
                    console.log("successfully stored a message");
                    break;
                default:
                    console.log("received unknown file format:", message.slice(0, 15).toString(), ".");
            }
        } catch (e) {
            console.log("error while writing file:", e);
        }

        try {
            const dirs = readdirSync("data/");
            const nbr = dirs.filter(entry => entry.endsWith(".db")).length;
            ws.send(`entries:${nbr}`);
        } catch (e) {
            console.log("error while reading directory:", e);
        }

        ws.close();
    });
});

wss.on("error", (err) => {
    console.log("error:", err);
});
