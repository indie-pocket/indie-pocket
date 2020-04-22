import {alert} from "tns-core-modules/ui/dialogs";
import {Component, OnDestroy, OnInit} from '@angular/core';
import {allowSleepAgain, keepAwake} from "nativescript-insomnia";
import {RouterExtensions} from "@nativescript/angular";
import {CollectorService} from "~/app/collector.service";
import {debug} from "~/lib/global";
import {Image, isAndroid, Page, PanGestureEventData} from "@nativescript/core";
import {AppSyncService} from "~/app/app-sync.service";
import {DataService} from "~/app/data.service";
import {Log} from "~/lib/log";
import {screen} from "@nativescript/core/platform";

@Component({
    selector: 'ns-insomnia',
    templateUrl: './insomnia.component.html',
    styleUrls: ['./insomnia.component.css']
})
export class InsomniaComponent implements OnInit, OnDestroy {
    public static secret = [true, false, false, true, false];
    public counter = 0;
    public version: string;
    public currentSpeed: string;
    public countdown = 0;
    public uploading = 0;

    private countdownInterval;
    private progressUpdate;
    private zipperInterval;
    private zipperCounter = Math.PI;
    private zipperSliderImage: Image;
    private zipperImage: Image;

    constructor(
        private routerExtensions: RouterExtensions,
        public collector: CollectorService,
        private page: Page,
        private appsync: AppSyncService,
        private data: DataService,
    ) {
        this.version = appsync.getVersion();
        if (isAndroid) {
            this.page.actionBarHidden = true;
        }
    }

    get zero(): boolean {
        return InsomniaComponent.secret[this.counter];
    }

    async ngOnInit() {
        this.currentSpeed = "Recording speed is: " + this.data.getKV("speed");
        await keepAwake();
        if (this.collector.recording !== 2) {
            this.countdown = debug ? 2 : 5;
            this.countdownInterval = setInterval(() => {
                this.countdown--;
                if (this.countdown === 0) {
                    clearInterval(this.countdownInterval);
                    this.start();
                }
            }, 1000);
        }
        this.zipperImage = <Image>this.page.getViewById('zipper');
        this.zipperSliderImage = <Image>this.page.getViewById('zipper-slider');
    }

    async ngOnDestroy() {
        await allowSleepAgain();
        clearInterval(this.zipperInterval);
    }

    reset() {
        this.counter = 0;
    }

    async start() {
        this.appsync.block = true;
        if (!this.collector.labels.active || this.collector.recording === 2) {
            return;
        }
        await this.collector.start();
        this.zipperBlink()
    }

    zipperBlink() {
        this.zipperCounter = Math.PI;
        this.zipperInterval = setInterval(() => {
            this.zipperCounter++;
            // Values from 1..2 show up as plain, so this makes the zipper appear plain
            // black for longer than it does the blinking.
            const zipperIndex = Math.abs(Math.sin(this.zipperCounter / 10) * 2);
            if (zipperIndex <= 1) {
                this.zipperImage.setInlineStyle("opacity: " + zipperIndex);
            }
        }, 100);
    }

    zipperClear() {
        clearInterval(this.zipperInterval);
        this.zipperImage.setInlineStyle("opacity: 0.5");
    }

    async unzip(args: PanGestureEventData) {
        if (this.collector.recording !== 2) {
            return;
        }
        const width = (this.zipperImage.getMeasuredWidth() - this.zipperSliderImage.getMeasuredWidth()) /
            screen.mainScreen.scale;
        switch (args.state) {
            case 1:
                this.zipperClear();
                break;
            case 2:
                if (args.deltaX < 0) {
                    return;
                }
                if (args.deltaX > width) {
                    if (this.collector.lessClicks){
                        return this.routerExtensions.navigateByUrl("/measure/upload");
                    } else {
                        return this.routerExtensions.navigateByUrl("/measure/choose");
                    }
                }
                this.zipperSliderImage.translateX = args.deltaX;
                break;
            case 3:
                this.zipperSliderImage.translateX = 0;
                this.zipperBlink();
                break;
        }
    }

    async pause() {
        switch (this.collector.recording) {
            case 1:
                this.zipperBlink();
                break;
            case 2:
                this.zipperClear();
                break;
        }
        return this.collector.pause();
    }

    async stop() {
        if (this.collector.recording === 0) {
            return;
        }

        return this.routerExtensions.navigateByUrl("/measure/choose");
    }

    async abortUpload() {
        clearInterval(this.progressUpdate);
        await alert("Upload cancelled");
        this.uploading = -1;
        this.collector.time = 0;
        await this.collector.db.clean();
    }
}
