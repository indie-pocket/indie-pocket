import {Component, OnInit} from '@angular/core';
import {allowSleepAgain, keepAwake} from "nativescript-insomnia";
import {RouterExtensions} from "@nativescript/angular";
import {CollectorService} from "~/app/collector.service";
import {debug} from "~/lib/global";

@Component({
    selector: 'ns-insomnia',
    templateUrl: './insomnia.component.html',
    styleUrls: ['./insomnia.component.css']
})
export class InsomniaComponent implements OnInit {

    public static secret = [true, false, false, true, false];
    public counter = 0;

    constructor(
        private routerExtensions: RouterExtensions,
        public collector: CollectorService,
    ) {
    }

    get zero(): boolean {
        return InsomniaComponent.secret[this.counter];
    }

    async ngOnInit() {
        await keepAwake();
    }

    reset() {
        this.counter = 0;
    }

    async goOn() {
        this.counter++;
        if (this.counter >= InsomniaComponent.secret.length ||
            debug && this.counter >= 2) {
            await allowSleepAgain();
            this.routerExtensions.back();
        }
    }
}
