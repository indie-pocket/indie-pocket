import {NgModule} from "@angular/core";
import {NativeScriptRouterModule} from "nativescript-angular/router";
import {Routes} from "@angular/router";

import {MainComponent} from "~/app/main/main.component";
import {DebugComponent} from "~/app/debug/debug.component";
import {FeedbackComponent} from "~/app/feedback/feedback.component";
import {PocketComponent} from "~/app/pocket/pocket.component";
import {InsomniaComponent} from "~/app/pocket/insomnia/insomnia.component";
import {ChooseComponent} from "~/app/pocket/choose/choose.component";
import {UploadComponent} from "~/app/pocket/upload/upload.component";

const routes: Routes = [
    {path: "", redirectTo: "/main", pathMatch: "full"},
    {path: "feedback", component: FeedbackComponent},
    {path: "debug", component: DebugComponent},
    {path: "main", component: MainComponent},
    {path: "measure", component: PocketComponent, children: [
            {path: "insomnia", component: InsomniaComponent},
            {path: "choose", component: ChooseComponent},
            {path: "upload", component: UploadComponent},
        ]},
];

@NgModule({
    imports: [NativeScriptRouterModule.forRoot(routes)],
    exports: [NativeScriptRouterModule]
})
export class AppRoutingModule {
}
