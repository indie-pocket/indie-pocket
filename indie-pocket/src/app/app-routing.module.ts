import {NgModule} from "@angular/core";
import {NativeScriptRouterModule} from "nativescript-angular/router";
import {Routes} from "@angular/router";

import {MainComponent} from "~/app/main/main.component";
import {MeasureComponent} from "~/app/measure/measure.component";
import {DebugComponent} from "~/app/debug/debug.component";
import {FeedbackComponent} from "~/app/feedback/feedback.component";

const routes: Routes = [
    {path: "", redirectTo: "/main", pathMatch: "full"},
    {path: "feedback", component: FeedbackComponent},
    {path: "debug", component: DebugComponent},
    {path: "main", component: MainComponent},
    {path: "measure", component: MeasureComponent}
];

@NgModule({
    imports: [NativeScriptRouterModule.forRoot(routes)],
    exports: [NativeScriptRouterModule]
})
export class AppRoutingModule {
}
