import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-driver-rides',
  templateUrl: './driver-rides.page.html',
  styleUrls: ['./driver-rides.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class DriverRidesPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
