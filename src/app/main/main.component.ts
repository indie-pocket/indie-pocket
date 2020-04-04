import {Component, OnInit} from '@angular/core';

@Component({
    selector: 'ns-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
    public trackingText = "";
    public isTracking = true;
    public dataSize = 0;
    private updateData;

    constructor() {
    }

    ngOnInit(): void {
        this.updateTracking();
    }

    updateTracking() {
        if (!this.isTracking) {
            clearInterval(this.updateData);
            this.dataSize = 0;
        } else {
            this.updateData = setInterval(() => {
                console.log("updating size");
                this.dataSize++;
            }, 1000);
        }
    }

    trackToggle(t) {
        this.isTracking = t.object.checked;
        this.updateTracking();
        console.log("toggle is", this.isTracking);
        this.trackingText = this.isTracking ? "YOU'RE BEING TRACKED" : "";
    }
}
