import {Component, OnInit} from "@angular/core";
import {AppSyncService} from "~/app/app-sync.service";
import {CollectorService} from "~/app/collector.service";
import {DataService} from "~/app/data.service";
import {debugOpt} from "~/lib/global";
import {Log} from "~/lib/log";


@Component({
    selector: "ns-app",
    templateUrl: "./app.component.html"
})
export class AppComponent implements OnInit {
    constructor(
        private appsync: AppSyncService,
        private collector: CollectorService,
        private data: DataService,
    ) {
    }

    async ngOnInit() {
        try {
            await this.data.connect(debugOpt.dropDB);
        } catch (e) {
            Log.error("couldn't start db:", e);
        }
        this.appsync.init();
        await this.collector.init(this.data, this.appsync.getVersion());
    }
}
