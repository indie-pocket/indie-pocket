import {Component, OnInit} from '@angular/core';
import {DataService} from "~/app/data.service";
import { RouterExtensions } from "nativescript-angular/router";
import {Version} from "~/lib/global";

@Component({
    selector: 'ns-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
    public version = Version;

    constructor(private data: DataService,
                private routerExtensions: RouterExtensions
    ) {
    }

    async ngOnInit(){
        try {
            await this.data.connect();
        } catch (e) {
            console.log("couldn't start db:", e);
        }
        console.log("kv is", this.data.getKV("again"));
        if (this.data.getKV("again") === "true"){
            console.log("going measure");
            this.routerExtensions.navigateByUrl("/measure");
        } else {
            await this.data.setKV("again", "true");
        }
    }
}
