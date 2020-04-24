import {Component, OnInit} from '@angular/core';
import {CollectorService} from "~/app/collector.service";
import {Page} from "@nativescript/core";
import {Log} from "~/lib/log";
import {DataService} from "~/app/data.service";
import {RouterExtensions} from "@nativescript/angular";
import Timeout = NodeJS.Timeout;

@Component({
    selector: 'ns-upload',
    templateUrl: './upload.component.html',
    styleUrls: ['./upload.component.css']
})
export class UploadComponent implements OnInit {
    public uploading = 0;
    private progressUpdate: Timeout;

    constructor(
        private collector: CollectorService,
        private page: Page,
        private data: DataService,
        private router: RouterExtensions,
    ) {
        this.page.actionBarHidden = true;
        this.collector.labels.tab = -1;
    }

    async ngOnInit() {
        switch (this.collector.recording) {
            case 0:
                return this.router.navigateByUrl("/measure/choose",
                    {clearHistory: true});
            case 2:
                return this.collector.pause();
        }
    }

    async stop(upload: boolean) {
        try {
            this.collector.labels.clear();
            await this.collector.stop();
            this.collector.rowString = "";
            if (upload) {
                console.log("stop and upload");
                this.uploading = 10;
                this.progressUpdate = setInterval(() => {
                    this.uploading += (100 - this.uploading) / 10;
                }, 250);
                let total = -1;
                try {
                    total = await this.collector.db.uploadDB();
                    if (this.uploading === -1) {
                        Log.warn("upload aborted");
                        return;
                    }
                    clearInterval(this.progressUpdate);
                } catch (e) {
                    clearInterval(this.progressUpdate);
                    this.uploading = -1;
                    await alert("Couldn't upload data: " + e.toString());
                }
                if (this.uploading > 0) {
                    this.uploading = 100;
                    const totStr = total > 0 ? ` Total available datasets on remote server: ${total}` : "";
                    await alert({
                        message: `Successfully uploaded data.` + totStr,
                        title: "Success",
                        okButtonText: "Go on rockin'"
                    });
                    this.uploading = -1;
                    await this.data.incTime(0, this.collector.time);
                }
            }
            this.collector.time = 0;
            await this.collector.db.clean();
        } catch (e) {
            Log.lvl2("no confirmation:", e);
        }
        return this.router.navigateByUrl("/measure/choose",
            {clearHistory: true});
    }

    async upload() {

    }

    async continue() {
        return this.router.navigateByUrl("/measure/choose",
            {clearHistory: true});
    }

    async abortUpload() {
        clearInterval(this.progressUpdate);
        this.uploading = -1;
        await alert("Upload cancelled");
        this.collector.time = 0;
        await this.collector.db.clean();
        return this.router.navigateByUrl("/measure/choose",
            {clearHistory: true});
    }
}
