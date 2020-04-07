import {Server} from "ws";
import {writeFile} from "fs";

const wss = new Server({ port: 5678 });

console.log("started server on port", 5678);

wss.on('connection', (ws) => {
    console.log("connected");
    ws.on('message', (message) => {
        console.log('received: %s', Buffer.from(message).length);
        const name = `sensors-${new Date().getTime()}.db`;
        writeFile("data/"+name, message, (err)=>{
            if (err){
                console.log("error while writing file", name, err);
                return;
            }
            console.log("successfully written file", name);
        });
    });

    ws.send('something');
});

wss.on("error", (err)=>{
    console.log("error:", err);
});
