import {Component, OnInit} from '@angular/core';
import {RouterExtensions} from "nativescript-angular/router";
import {DataService} from "~/app/data.service";
import {debugOpt} from "~/lib/global";
import {AppSyncService} from "~/app/app-sync.service";
import {CollectorService} from "~/app/collector.service";
import {EventData, Page} from "@nativescript/core";
import {Log} from "~/lib/log";

/**
 * PocketComponent is the main component of the app. It allows the user to chose her
 * placement and activity.
 */
@Component({
    selector: 'ns-measure',
    templateUrl: './pocket.component.html',
    styleUrls: ['./pocket.component.css']
})
export class PocketComponent implements OnInit {
    public version: string;
    public loaded = false;

    constructor(
        private routerExtensions: RouterExtensions,
        private appsync: AppSyncService,
        private data: DataService,
        private collector: CollectorService,
        private page: Page,
    ) {
        this.version = appsync.getVersion();
        this.page.actionBarHidden = true;
    }

    async ngOnInit() {
        this.appsync.block = false;
        if (debugOpt.showDT) {
            this.collector.labels.setPlacement(1);
            this.collector.labels.setActivity(1);
            await this.collector.start();
            setTimeout(() => {
                this.collector.labels.clear();
                this.collector.db.clean();
            }, 1000);
        }
    }

    async goMain() {
        if (this.collector.recording === 0) {
            await this.data.setKV("again", "false");
            return this.routerExtensions.navigateByUrl("/",
                {clearHistory: true});
        }
    }
}
