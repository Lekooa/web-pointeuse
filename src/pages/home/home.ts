import { Component, OnInit, NgZone } from '@angular/core';
import { Http } from '@angular/http';
import { NavController, Events, Loading, LoadingController, AlertController, ToastController } from 'ionic-angular';
import { UserInterface } from '../../interfaces/user';
import { MainPage } from '../main/main';
import { EventsManager } from '../../utils/events-manager';
import { BleService } from '../../services/ble';
import 'rxjs/add/operator/map';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnInit {

  public username: string = '';
  public password: string = '';
  public user: UserInterface;

  public statusMessage: string;
  public _isDisplaySpinner: boolean;

  private isLocationDetected: boolean = false;
  private loading: Loading

  constructor(public navCtrl: NavController,
    private _events: Events,
    private _eventsM: EventsManager,
    private _http: Http,
    private _loading: LoadingController,
    private _alert: AlertController,
    private _toastCtrl: ToastController,
    private _ngZone: NgZone,
    private _bleService: BleService) {

  }

  ngOnInit() {
    console.log('HomePage');
    this.subscribingEvents();
    this.onSearchBeacon();
    if (localStorage.getItem('isLoginValid') === 'true' && this.isLocationDetected === true) {
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

  ngOnDestroy() {
    console.log('EmargementPage > ngOnDestroy()');
    this.unsubscribingEvents();
  }

  subscribingEvents() {
    console.log('EmargementPage > subscribingEvents()');
    let tthis = this;
    this._eventsM.ble.initializing().subscribe(() => {
      console.log('EmargementPage > Subscribe(ble:initializing)');
    });
    this._eventsM.ble.disabled().subscribe(() => {
      console.log('EmargementPage > Subscribe(ble:disabled)');
    });
    this._eventsM.ble.enabling().subscribe(() => {
      console.log('EmargementPage > Subscribe(ble:enabling)');

      this._toastCtrl.create({
        message: 'Enabling bluetooth...',
        duration: 5 * 1000
      }).present();

    });
    this._eventsM.ble.enabled().subscribe(() => {
      console.log('EmargementPage > Subscribe(ble:enabled)');
    });
    this._eventsM.ble.requestPermissionDeny().subscribe(() => {
      console.log('EmargementPage > Subscribe(ble:requestPermissionDeny)');
      this.onRequestPermissionDeny();
    });
    this._eventsM.ble.beaconDetected().subscribe(() => {
      console.log(`EmargementPage > Subscribe(ble:beaconDetected)`);
      this.onDetectedBeacon();
    });
    this._eventsM.ble.beaconNotDetected().subscribe(() => {
      console.log('EmargementPage > Subscribe(ble:beaconNotDetected)');
      this.onNotDetectedBeacon();
    });
    // this._eventsM.ble.deviceIdNotEqual().subscribe(() => {
    //   console.log('EmargementPage > Subscribe(ble:deviceIdNotEqual)');
    //   this.onNotDeviceIdNotEqual();
    // });
    this._eventsM.ble.deviceNotBleCompatible().subscribe(() => {
      console.log('EmargementPage > Subscribe(ble:deviceNotBleCompatible)');
      this.onNotDeviceBleCompatible();
    });
    this._eventsM.ble.requestLocation().subscribe(() => {
      console.log('EmargementPage > Subscribe(ble:requestLocation)');
    });
    this._eventsM.ble.requestLocationEnabled().subscribe(() => {
      console.log('EmargementPage > Subscribe(ble:requestLocationEnabled)');

      setTimeout(function () {
        tthis.onSearchBeacon();
      }, 500);
    });
    this._eventsM.ble.requestLocationDisabled().subscribe(() => {
      console.log('EmargementPage > Subscribe(ble:requestLocationDisabled)');
      this.onRequestLocationDisabled();
    });
  }

  unsubscribingEvents() {
    console.log('EmargementPage > unsubscribingEvents()');
    this._eventsM.ble.initializing().unsubscribe();
    this._eventsM.ble.disabled().unsubscribe();
    this._eventsM.ble.enabling().unsubscribe();
    this._eventsM.ble.enabled().unsubscribe();
    this._eventsM.ble.requestPermissionDeny().unsubscribe();
    this._eventsM.ble.beaconDetected().unsubscribe();
    this._eventsM.ble.beaconNotDetected().unsubscribe();
    // this._eventsM.ble.deviceIdNotEqual().unsubscribe();
    this._eventsM.ble.deviceNotBleCompatible().unsubscribe();
    this._eventsM.ble.requestLocation().unsubscribe();
    this._eventsM.ble.requestLocationEnabled().unsubscribe();
    this._eventsM.ble.requestLocationDisabled().unsubscribe();
  }

  notifyUI(showSpinner, statusMessage) {
    this._ngZone.run(() => {
      this.statusMessage = statusMessage;
      showSpinner ? this.showSpinner() : this.hideSpinner();
    });
  }

  showSpinner() {
    this._isDisplaySpinner = true;
  }
  hideSpinner() {
    this._isDisplaySpinner = false;
  }

  onSearchBeacon() {
    console.log('EmargementPage > onSearchBeacons()');
    this.isLocationDetected = false;
    this.notifyUI(true, "");
    this._bleService.searchingBeacon();
  }

  onDetectedBeacon() {
    console.log(`EmargementPage > onDetectedBeacon()`);
    this.isLocationDetected = true;
    this.notifyUI(false, 'You\'re at the office :D');
  }

  onNotDetectedBeacon() {
    console.log('EmargementPage > onNotDetectedBeacon()');
    this.notifyUI(false, 'You little cheater, not at the office right now !');
  }

  onNotDeviceBleCompatible() {
    console.log('EmargementPage > onNotDeviceBleCompatible()');
    this.notifyUI(false, 'Sorry but you can\'t use this app on this device (You do not have BLE)');
  }

  // onNotDeviceIdNotEqual() {
  //   console.log('EmargementPage > onNotDeviceIdNotEqual()');
  //   this.notifyUI(false, this._translate.instant('PAGE.EMARGEMENT.DEVICE_ID_NOT_EQUAL'));
  // }

  onRequestPermissionDeny() {
    console.log('EmargementPage > onRequestPermissionDeny()');
    this.notifyUI(false, 'You really should enable this :( !');
  }

  onRequestLocationDisabled() {
    console.log('EmargementPage > onRequestLocationDisabled()');
    this.notifyUI(false, 'You should enable location :)');
  }
}
