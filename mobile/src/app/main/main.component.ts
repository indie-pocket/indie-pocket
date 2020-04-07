import {Component, OnInit} from '@angular/core';
import {DataService} from "~/app/data.service";
import {RouterExtensions} from "nativescript-angular/router";
import {randomBytes} from "crypto-browserify";
import {AppSyncService} from "~/app/app-sync.service";

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
            await this.data.connect(true);
        } catch (e) {
            console.log("couldn't start db:", e);
        }
        this.version = this.appsync.getVersion();
        console.log("kv is", this.data.getKV("again"));
        let iid = this.data.getKV("iid");
        console.log("iid is:", iid);
        if (iid === undefined || iid.length < 10) {
            iid = randomBytes(8).toString("hex");
            await this.data.setKV("iid", iid);
        }
        this.id = "Unique ID: " + iid;
        if (this.data.getKV("again") === "true") {
            console.log("going measure");
            return this.routerExtensions.navigateByUrl("/measure");
        } else {
            await this.data.setKV("again", "true");
        }
    }

    goDebug() {
        this.routerExtensions.navigateByUrl("/debug");
    }
}
