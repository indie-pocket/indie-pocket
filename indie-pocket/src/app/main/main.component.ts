import {Component, OnInit} from '@angular/core';
import {DataService} from "~/app/data.service";
import {RouterExtensions} from "nativescript-angular/router";
import {randomBytes} from "crypto-browserify";
import {AppSyncService} from "~/app/app-sync.service";
import {Log} from "~/lib/log";
import {debugOpt} from "~/lib/global";
import {alert} from "tns-core-modules/ui/dialogs";

/**
 * MainComponent initializes the dataService and makes sure that the first scren is only showed
 * at the first startup.
 */
@Component({
    selector: 'ns-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
    public version: string;
    public id = "loading...";

    constructor(
        private data: DataService,
        private routerExtensions: RouterExtensions,
        private appsync: AppSyncService
    ) {
    }

    async ngOnInit() {
        try {
            await this.data.connect(debugOpt.dropDB);
        } catch (e) {
            Log.error("couldn't start db:", e);
        }
        this.version = this.appsync.getVersion();
        Log.lvl1("kv is", this.data.getKV("again"));
        let iid = this.data.getKV("iid");
        Log.lvl1("iid is:", iid);
        if (iid === undefined || iid.length < 10) {
            iid = randomBytes(8).toString("hex");
            await this.data.setKV("iid", iid);
        }
        this.id = "Unique ID: " + iid;

        if (this.data.getKV("showFeedback") === undefined ||
            this.data.getKV("showFeedback") !== "done") {
            setTimeout(() => {
                alert({
                    message: "You can now give feedback - come back to this entry page and click on 'Give Feedback'",
                    title: "Info",
                    okButtonText: "Cool"
                });
            }, 100);
            await this.data.setKV("showFeedback", "done");
        }

        if (this.data.getKV("again") === "true") {
            Log.lvl1("going measure");
            return this.routerExtensions.navigateByUrl("/measure");
        } else {
            Log.lvl1("setting again to true");
            await this.data.setKV("again", "true");
        }
    }

    goDebug() {
        this.routerExtensions.navigateByUrl("/debug");
    }
}
