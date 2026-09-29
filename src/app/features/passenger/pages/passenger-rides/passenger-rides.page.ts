import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-passenger-rides',
  templateUrl: './passenger-rides.page.html',
  styleUrls: ['./passenger-rides.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class PassengerRidesPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
