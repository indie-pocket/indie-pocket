import {Component, OnInit} from '@angular/core';
import {startAccelerometerUpdates} from "~/lib_acc";

@Component({
    selector: 'ns-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
    public trackingText = "";
    public isTracking = false;
    public dataSize = 0;
    private updateData;

    constructor() {
    }

    ngOnInit(): void {
        this.updateTracking(true);
    }

    updateTracking(newT: boolean) {
        if (newT === this.isTracking){
            return;
        }
        this.isTracking = newT;
        if (!this.isTracking) {
            clearInterval(this.updateData);
            this.dataSize = 0;
        } else {
            console.log("starting sensor tracking");
            this.updateData = setInterval(() => {
                // console.log("updating size");
                this.dataSize++;
            }, 1000);
        }
    }

    trackToggle(t) {
        this.updateTracking(t.object.checked);
        this.trackingText = this.isTracking ? "YOU'RE BEING TRACKED" : "";
    }
}
