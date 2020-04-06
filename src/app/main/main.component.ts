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
    public id = "loading...";

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
        if (this.data.getKV("iid") === undefined) {
            const r1 = Math.floor(1e9 * Math.random());
            const r2 = Math.floor(1e9 * Math.random());
            await this.data.setKV("iid", `${r1}${r2}`);
        }
        if (this.data.getKV("again") === "true"){
            console.log("going measure");
            this.routerExtensions.navigateByUrl("/measure");
        } else {
            this.id = "Unique ID: " + await this.data.getKV("iid");
            await this.data.setKV("again", "true");
        }
    }
}
