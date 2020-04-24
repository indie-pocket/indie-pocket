import {alert} from "tns-core-modules/ui/dialogs";
import {Component, OnInit} from '@angular/core';
import {allowSleepAgain, keepAwake} from "nativescript-insomnia";
import {RouterExtensions} from "@nativescript/angular";
import {CollectorService} from "~/app/collector.service";
import {debug} from "~/lib/global";
import {Image, Page, PanGestureEventData} from "@nativescript/core";
import {AppSyncService} from "~/app/app-sync.service";
import {DataService} from "~/app/data.service";
import {screen} from "@nativescript/core/platform";

@Component({
    selector: 'ns-insomnia',
    templateUrl: './insomnia.component.html',
    styleUrls: ['./insomnia.component.css']
})
export class InsomniaComponent implements OnInit {
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
        this.page.actionBarHidden = true;
    }

    get zero(): boolean {
        return InsomniaComponent.secret[this.counter];
    }

    async ngOnInit() {
        this.currentSpeed = "Recording speed is: " + this.data.getKV("speed");
        this.zipperImage = <Image>this.page.getViewById('zipper');
        this.zipperSliderImage = <Image>this.page.getViewById('zipper-slider');
        if (this.collector.recording !== 2) {
            this.countdown = debug ? 1 : 5;
            this.countdownInterval = setInterval(async () => {
                this.countdown--;
                if (this.countdown === 0) {
                    clearInterval(this.countdownInterval);
                    await this.lock();
                    await this.start();
                }
            }, 1000);
        } else {
            await this.lock();
        }
    }

    async lock() {
        this.collector.lock = true;
        this.appsync.block = true;
        await keepAwake();
    }

    async unlock() {
        this.collector.lock = false;
        this.appsync.block = false;
        await allowSleepAgain();
    }

    reset() {
        this.counter = 0;
    }

    async start() {
        if (!this.collector.labels.active || this.collector.recording === 2) {
            return;
        }
        await this.collector.start();
        this.zipperBlink();
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
        const width = (this.zipperImage.getMeasuredWidth() - this.zipperSliderImage.getMeasuredWidth()) /
            screen.mainScreen.scale;
        switch (args.state) {
            case 1:
                this.zipperClear();
                break;
            case 2:
                if (this.collector.lock) {
                    if (args.deltaX < 0) {
                        return;
                    }
                    if (args.deltaX > width) {
                        await this.unlock();
                        args.deltaX = width;
                    }
                    this.zipperSliderImage.translateX = args.deltaX;
                }
                break;
            case 3:
                if (!this.collector.lock) {
                    if (this.collector.lessClicks && this.collector.recording === 2) {
                        return this.leave("upload");
                    } else {
                        return this.leave("choose");
                    }
                }
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

    async leave(path: string) {
        await this.unlock();
        await allowSleepAgain();
        clearInterval(this.zipperInterval);
        clearInterval(this.countdownInterval);
        return this.routerExtensions.navigateByUrl("/measure/" + path,
            {clearHistory: true});
    }

    async abortUpload() {
        clearInterval(this.progressUpdate);
        await alert("Upload cancelled");
        this.uploading = -1;
        this.collector.time = 0;
        await this.collector.db.clean();
    }
}
