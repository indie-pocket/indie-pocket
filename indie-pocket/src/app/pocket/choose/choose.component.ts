import {Component, OnInit} from '@angular/core';
import {CollectorService} from "~/app/collector.service";
import {Log} from "~/lib/log";
import {Page} from "@nativescript/core";
import {RouterExtensions} from "@nativescript/angular";

@Component({
    selector: 'ns-choose',
    templateUrl: './choose.component.html',
    styleUrls: ['./choose.component.css']
})
export class ChooseComponent implements OnInit {
    public zeroToFive = [...Array(6).keys()];
    public zeroToSeven = [...Array(8).keys()];
    public zeroToEight = [...Array(9).keys()];

    constructor(
        private collector: CollectorService,
        private page: Page,
        private routerExtensions: RouterExtensions,
    ) {
        this.page.actionBarHidden = true;
    }

    ngOnInit(): void {
        Log.print("choose");
        this.collector.labels.tab = 0;
    }

    setPlacement(p: number){
        this.collector.labels.setPlacement(p);
        if (this.collector.lessClicks){
            return this.start();
        }
    }

    async start() {
        if (this.collector.lessClicks){
            return this.routerExtensions.navigateByUrl("/measure/insomnia");
        } else {
            this.collector.start();
        }
    }

    async pause(){
        this.collector.pause();
    }

    async goLock(){
        if (this.collector.recording === 2) {
            return this.routerExtensions.navigateByUrl("/measure/insomnia");
        }
    }

    async stop(){
        if (this.collector.recording > 0) {
            return this.routerExtensions.navigateByUrl("/measure/upload");
        }
    }
}
