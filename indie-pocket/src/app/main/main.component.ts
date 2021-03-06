import {Component, OnInit} from '@angular/core';
import {DataService} from "~/app/data.service";
import {RouterExtensions} from "nativescript-angular/router";
import {randomBytes} from "crypto-browserify";
import {AppSyncService} from "~/app/app-sync.service";
import {Log} from "~/lib/log";
import {alert} from "tns-core-modules/ui/dialogs";
import {isAndroid, Page} from "@nativescript/core";
import {CollectorService} from "~/app/collector.service";

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
        private appsync: AppSyncService,
        private page: Page,
        private collector: CollectorService,
    ) {
        if (isAndroid) {
            this.page.actionBarHidden = true;
        }
    }

    async ngOnInit() {
        this.version = this.appsync.getVersion();
        Log.lvl1("kv is", this.data.getKV("again"));
        let iid = this.data.getKV("iid");
        Log.lvl1("iid is:", iid);
        if (iid === undefined || iid.length < 10) {
            iid = randomBytes(8).toString("hex");
            await this.data.setKV("iid", iid);
        }
        this.id = "Unique ID: " + iid;

        if (this.version.startsWith("0.4")) {
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
        }

        if (this.data.getKV("again") === "true") {
            Log.lvl1("going measure");
            return this.routerExtensions.navigateByUrl("/choose",
                {clearHistory: true});
        } else {
            Log.lvl1("setting again to true");
            await this.data.setKV("again", "true");
        }
    }

    goDebug() {
        this.routerExtensions.navigateByUrl("/debug",
            {clearHistory: true});
    }
}
