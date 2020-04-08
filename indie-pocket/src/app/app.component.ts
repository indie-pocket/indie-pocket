import {Component, OnInit} from "@angular/core";
import {AppSyncService} from "~/app/app-sync.service";


@Component({
    selector: "ns-app",
    templateUrl: "./app.component.html"
})
export class AppComponent implements OnInit {
    constructor(private appsync: AppSyncService) {
    }

    ngOnInit() {
        this.appsync.init();
    }
}
