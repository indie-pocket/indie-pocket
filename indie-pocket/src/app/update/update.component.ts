import {Component, OnInit} from '@angular/core';
import {AppSyncService} from "~/app/app-sync.service";

@Component({
    selector: 'ns-update',
    templateUrl: './update.component.html',
    styleUrls: ['./update.component.css']
})
export class UpdateComponent implements OnInit {
    public version: string;

    constructor(
        private appsync: AppSyncService
    ) {
        this.version = appsync.getVersion();
    }

    ngOnInit(): void {
    }
}
