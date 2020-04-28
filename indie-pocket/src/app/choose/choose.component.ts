import {Component, OnInit} from '@angular/core';
import {CollectorService} from "~/app/collector.service";
import {Page} from "@nativescript/core";
import {RouterExtensions} from "@nativescript/angular";
import {debug, debugOpt} from "~/lib/global";
import {Log} from "~/lib/log";
import Timeout = NodeJS.Timeout;
import {DataService} from "~/app/data.service";
import {AppSyncService} from "~/app/app-sync.service";

@Component({
    selector: 'ns-choose',
    templateUrl: './choose.component.html',
    styleUrls: ['./choose.component.css']
})
export class ChooseComponent implements OnInit {
    public zeroToFive = [...Array(6).keys()];
    public zeroToSeven = [...Array(8).keys()];
    public zeroToEight = [...Array(9).keys()];
    public tab = 0;
    public tabUpdate: Timeout;
    public version;

    constructor(
        private collector: CollectorService,
        private page: Page,
        private routerExtensions: RouterExtensions,
        private data: DataService,
        private appSync: AppSyncService,
    ) {
        this.page.actionBarHidden = true;
    }

    ngOnInit(): void {
        this.version = this.appSync.getVersion();
        if (debugOpt.testTab === 2) {
            Log.print(this.collector.labels.phase);
            setTimeout(() => {
                this.setPlacement(1);
            }, 250);
        }
        if (debugOpt.testTab === 1){
            let counter = 0;
            setInterval(()=>{
                if (counter++ % 2 === 0){
                    this.tab = 0;
                } else {
                    this.tab = 1;
                }
                Log.print(counter);
            }, 250);
        }
    }

    setPlacement(p: number) {
        this.collector.labels.setPlacement(p);
        if (this.collector.lessClicks) {
            return this.start();
        }
    }

    async start() {
        if (this.collector.lessClicks) {
            return this.leave("/insomnia");
        } else {
            this.collector.start();
        }
    }

    async pause() {
        this.collector.pause();
    }

    async goLock() {
        if (this.collector.recording === 2) {
            return this.leave("/insomnia");
        }
    }

    async stop() {
        if (this.collector.recording > 0) {
            return this.leave("/upload");
        }
    }

    async leave(path: string) {
        return this.routerExtensions.navigateByUrl(path,
            {clearHistory: true});
    }

    async goMain() {
        await this.data.setKV("again", "false");
        return this.leave("/");
    }
}
