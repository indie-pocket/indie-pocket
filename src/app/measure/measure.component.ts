import { Component, OnInit } from '@angular/core';
import { RouterExtensions } from "nativescript-angular/router";

@Component({
  selector: 'ns-measure',
  templateUrl: './measure.component.html',
  styleUrls: ['./measure.component.css']
})
export class MeasureComponent implements OnInit {
  public askPlacement = true;
  public askActivity = false;

  constructor(private routerExtensions: RouterExtensions) { }

  ngOnInit(): void {
    this.setPlacement(true)
  }

  setPlacement(p: boolean){
    this.askPlacement = p;
    this.askActivity = !p;
  }

  placement(label: string){
    console.log("placement:", label);
    this.setPlacement(false);
  }

  activity(label: string){
    console.log("activity", label);
    this.setPlacement(true);
    this.routerExtensions.navigate(["/main"]);
  }

}
