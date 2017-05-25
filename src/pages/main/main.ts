import { Component, OnInit } from '@angular/core';
import { NavController } from 'ionic-angular';
import { UserInterface } from '../../interfaces';
import { Http, RequestOptions, Headers } from '@angular/http';

@Component({
  selector: 'page-main',
  templateUrl: 'main.html'
})
export class MainPage implements OnInit {

  public user: UserInterface;

  constructor(public navCtrl: NavController,
    private _http: Http) {

  }

  ngOnInit() {
    let user = JSON.parse(localStorage.getItem('user'));

    this.user = {
      userName: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    }

  }

  public sayHello() {
    let headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
    let options = new RequestOptions({ headers: headers });
    this._http.post('https://hooks.slack.com/services/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', `{"text": "${this.user.firstName} est arrivé au bureau !"}`, options)
      .map(res => res.json())
      .subscribe(data => this.saveJwt(data.id_token),
      err => this.logError(err),
      () => console.log('Authentication Complete'));
  }

  public sayBye() {
    let headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
    let options = new RequestOptions({ headers: headers });
    this._http.post('https://hooks.slack.com/services/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', `{"text": "${this.user.firstName} est sur le point de partir :( !"}`, options)
      .map(res => res.json())
      .subscribe(data => this.saveJwt(data.id_token),
      err => this.logError(err),
      () => console.log('Authentication Complete'));
  }

  public setStatus() {

  }

  saveJwt(jwt) {
    if (jwt) {
      localStorage.setItem('id_token', jwt)
    }
  }

  logError(err) {
    console.error('There was an error: ' + err);
  }

}
