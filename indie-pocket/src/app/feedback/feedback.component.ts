import {Component, OnInit} from '@angular/core';
import {RouterExtensions} from "@nativescript/angular";
import {Log} from "~/lib/log";
import {EventData, TextView} from "@nativescript/core";
import {serverURL} from "~/lib/global";
import {confirm} from "tns-core-modules/ui/dialogs";
// tslint:disable-next-line
const WS = require("nativescript-websockets");

@Component({
    selector: 'ns-feedback',
    templateUrl: './feedback.component.html',
    styleUrls: ['./feedback.component.css']
})
export class FeedbackComponent implements OnInit {
    public text: EventData | undefined;

    constructor(
        private routerExtensions: RouterExtensions,
    ) {
    }

    ngOnInit(): void {
    }

    async send() {
        const tv = this.text.object as TextView;
        Log.print(tv.text);
        const text = `User message   ${tv.text}`;

        // The happy path of this is:
        // - ws.open()
        // - on("open" - sends the message and waits for the reply
        // - on("message" - closes the connection
        // if something goes wrong, on("error" is called.
        const ws = new WS(serverURL, {timeout: 1000});
        // to prevent the browser to use blob
        ws.binaryType = "arraybuffer";
        ws.open();
        ws.on("open", () => {
            ws.send(text);
        });
        ws.on("message", async (_, msg) => {
            Log.lvl2("returned", msg);
            ws.close(1000);
            await confirm("Successfully sent message");
            return this.routerExtensions.navigateByUrl("/main");
        });
        ws.on("error", (_, err) => {
            Log.lvl2("error:", err);
            alert("Error while sending message: " + err.toString());
        });
    }

    cancel() {
        return this.routerExtensions.navigateByUrl("/main");
    }
}
