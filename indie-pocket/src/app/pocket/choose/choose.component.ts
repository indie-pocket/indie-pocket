import {Component, OnInit} from '@angular/core';
import {CollectorService} from "~/app/collector.service";
import {Page} from "@nativescript/core";
import {RouterExtensions} from "@nativescript/angular";
import {debug, debugOpt} from "~/lib/global";
import {Log} from "~/lib/log";
import Timeout = NodeJS.Timeout;

@Component({
    selector: 'ns-choose',
    templateUrl: './choose.component.html',
    styleUrls: ['./choose.component.css']
})
export class ChooseComponent implements OnInit {
    public zeroToFive = [...Array(6).keys()];
    public zeroToSeven = [...Array(8).keys()];
    public zeroToEight = [...Array(9).keys()];
    public tab = -1;
    public tabUpdate: Timeout;

    constructor(
        private collector: CollectorService,
        private page: Page,
        private routerExtensions: RouterExtensions,
    ) {
        this.page.actionBarHidden = true;
    }

    ngOnInit(): void {
        this.collector.labels.tab = 0;
        this.tabUpdate = setInterval(() => {
            this.tab = this.collector.labels.tab;
        }, 500);
        if (debugOpt.testTab === 2) {
            Log.print(this.collector.labels.phase);
            setTimeout(() => {
                this.setPlacement(1);
            }, 500);
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
            return this.leave("insomnia");
        } else {
            this.collector.start();
        }
    }

    async pause() {
        this.collector.pause();
    }

    async goLock() {
        if (this.collector.recording === 2) {
            return this.leave("insomnia");
        }
    }

    async stop() {
        if (this.collector.recording > 0) {
            return this.leave("upload");
        }
    }

    async leave(path: string) {
        clearInterval(this.tabUpdate);
        return this.routerExtensions.navigateByUrl("/measure/" + path,
            {clearHistory: true});
    }
}
