import { Component, OnInit } from '@angular/core';
import { Http } from '@angular/http';
import { NavController, Events, Loading, LoadingController, AlertController } from 'ionic-angular';
import { UserInterface } from '../../interfaces';
import { MainPage } from '../main/main';
import 'rxjs/add/operator/map';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnInit {

  public username: string = '';
  public password: string = '';

  public user: UserInterface;

  private loading: Loading

  constructor(public navCtrl: NavController,
    private _events: Events,
    private _http: Http,
    private _loading: LoadingController,
    private _alert: AlertController) {

  }

  ngOnInit() {
    console.log('HomePage');
    if (localStorage.getItem('isLoginValid') === 'true') {
      this._alert.create({
        title: 'Auto-Login',
        message: "Logging in as " + JSON.parse(localStorage.getItem('user')).userName,
        buttons: ['CLOSE']
      }).present();
      this.navCtrl.push(MainPage);
    }
  }

  public onLogin() {
    this.loading = this._loading.create({
      content: "Please wait..."
    });
    this.loading.present();
    this.username = this.username.toLowerCase();

    this.setUser(this.username, this.password);

    this.getUsers().subscribe((data) => {
      let file = data;
      this.validateLogin(file);
      this.loading.dismiss();
      if (localStorage.getItem('isLoginValid') === 'true') {
        this.navCtrl.push(MainPage);
      }
    });
  }

  private isUserKnown(file: any): boolean {
    console.log('HomePage > isUserKnown');
    let currentUser: any;
    let status: boolean = false;
    for (currentUser in file) {
      if (this.username == file[currentUser].username) {
        status = true;
        this.user = {
          userName: file[currentUser].username,
          firstName: file[currentUser].firstName,
          lastName: file[currentUser].lastName,
          role: file[currentUser].role
        };
        localStorage.setItem('user', JSON.stringify(this.user));
        console.log('User found at ' + this.username);
      }
    }
    return status;

  }

  private getUsers(): any {
    return this._http.get('assets/users/users.json')
      .map(response => response.json())
  }

  private validateLogin(file: any) {
    console.log('Validating login for ' + this.username + '...');
    if (this.isUserKnown(file.users) && this.password == 'Lekooa**') {
      localStorage.setItem('isLoginValid', 'true');
      console.log('Valid login');
    } else {
      localStorage.setItem('isLoginValid', 'false');
      this._alert.create({
        title: 'ERROR',
        message: "Wrong password or username...",
        buttons: ['RETRY']
      }).present();
    }
  }

  private setUser(username: string, password: string) {
    this.username = username;
    this.password = password;
  }


}
