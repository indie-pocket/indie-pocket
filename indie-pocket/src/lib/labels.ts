import {DataService} from "~/app/data.service";
import {gameButtons} from "~/lib/global";
import {screen} from "@nativescript/core/platform";

export class Labels {
    public phase: number;
    public placementClasses: string[] = ["", "", "", "", "", "", "", "", "", ""];
    public placementLabels = ['choose',
        'on table', 'in hand', 'against head',
        'front pocket', 'back pocket', 'front jacket pkt',
        'handbag', 'backpack'
    ];
    public activityClasses: string[] = ["", "", "", "", "", "", "", "", "", "", ""];
    public activityLabels = ['any', 'walking', 'standing', 'sitting',
        'going upstairs', 'going downstairs', 'transports',
        'running', 'biking'];
    public placement: number;
    public activity: number;
    public active: boolean;
    public tab: number;

    constructor(private data: DataService) {
        this.clear();
        this.update();
    }

    setPlacement(p: number) {
        this.placement = p;
        this.phase++;
        this.update();
    }

    setActivity(p: number) {
        this.activity = p;
        this.phase++;
        this.update();
    }

    update() {
        const small = screen.mainScreen.heightDIPs <= 320 ||
            screen.mainScreen.widthDIPs <= 320;
        const cScreen = small ? "small-screen " : "";
        for (let p = 1; p <= 8; p++) {
            const t = this.data.getTime(p);
            this.placementClasses[p] = cScreen + this.color(t);
        }
        this.placementClasses[this.placement] += " chosen";

        for (let a = 1; a <= 8; a++) {
            const t = this.data.getTime(a * 10);
            this.activityClasses[a] = cScreen + this.color(t);
        }
        this.activityClasses[0] = cScreen + "button-ok";
        this.activityClasses[this.activity] += " chosen";

        this.active = this.placement > 0;
    }

    color(time: number): string {
        if (time < gameButtons) {
            return "button-never";
        } else if (time < 2 * gameButtons) {
            return "button-medium";
        }
        return "button-ok";
    }

    clear() {
        this.placement = 0;
        this.activity = 0;
        this.phase = -2;
    }

    getNumeric(): number {
        return this.placement + this.activity * 10;
    }
}
