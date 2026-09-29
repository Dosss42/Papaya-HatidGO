import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-passenger-book',
  templateUrl: './passenger-book.page.html',
  styleUrls: ['./passenger-book.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class PassengerBookPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
