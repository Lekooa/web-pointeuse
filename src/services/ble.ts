import { Platform } from 'ionic-angular';
import { Device } from '@ionic-native/device';
import { Injectable } from '@angular/core';
import _ from 'lodash';
import { BeaconModel } from '../interfaces/beacon';
import { EventsManager } from '../utils/events-manager';
import { BleComponent } from '../utils/ble';
import { GetBeaconResponse } from './beacon';

declare var estimote;

const SCANNING_DELAY = 20 * 1000;

@Injectable()
export class BleService {

    beaconDetected: BeaconDevice;
    isBleEnabled: boolean = false;
    hasPermission: boolean = false;
    isLocationEnabled: boolean = false;
    bleComponent: BleComponent = null;
    officeBeacon: GetBeaconResponse = {
        id: 1,
        mac_address: 'AB:CD:EF:GH:IJ:KL',
        uuid: '123123',
        major: 15,
        minor: 1
    };

    constructor(
        private _events: EventsManager,
        private _platform: Platform,
    ) {
        // init BLE component
        try {
            this.bleComponent = BleComponent.getInstance();
            console.log(this.bleComponent);
        } catch (error) {
            // Device (desktop, mobile, etc...) not compatible with BLE
        }
    }

    isDeviceBLECompatible(): boolean {
        return !_.isNull(this.bleComponent);
    }
    isAndroid(): boolean {
        let result: boolean = this._platform.is('android');
        console.debug(`AttendanceBleService > isAndroid() > result: ${result}`);
        return result;
    }
    isiOS(): boolean {
        let result: boolean = this._platform.is('ios');
        console.debug(`AttendanceBleService > isiOS() > result: ${result}`);
        return result;
    }

    searchingBeacon() {
        console.log('AttendanceBleService > searchingBeacon()');
        if (this.isBleEnabled) {
            this.startScanning();
        } else {
            this.initAndEnableBluetoothLE();
        }
    }

    /**
     * Initialize Bluetooth on the device. Must be called before anything else.
     */
    initAndEnableBluetoothLE() {
        console.log('AttendanceBleService > initAndEnableBluetoothLE()');

        if (this.isDeviceBLECompatible()) { // Only on mobile phone
            this._events.ble.initializing().publish();
            let params = {};
            let tthis = this;
            tthis.bleComponent.initialize(
                function (result) {
                    tthis.isBleEnabled = true;
                    console.log('AttendanceBleService > initialize() > status: ' + result.status);

                    // Bluetooth is disabled
                    if (!_.isEqual(result.status, "enabled")) {
                        tthis._events.ble.disabled().publish();
                        if (tthis.isAndroid()) { // Android support only.
                            tthis._events.ble.enabling().publish();
                            tthis.bleComponent.enable(
                                function (result) {
                                    console.log('AttendanceBleService > enable() > enableSuccess: %s', result);
                                },
                                function (err) {
                                    // TODO: send event to notif UI ?
                                    console.log('AttendanceBleService > enable() > enableError: %s', err);
                                }
                            );
                        }
                    } else if (_.isEqual(result.status, "enabled")) { // Bluetooth is enabled
                        tthis._events.ble.enabled().publish();
                        tthis.startScanning();
                    }
                },
                params
            );
        } else {
            this._events.ble.deviceNotBleCompatible().publish();
        }
    }

    startScanning() {
        console.log('AttendanceBleService > scanning()');
        let tthis = this;
        this.beaconDetected = null;

        // Android API >= 23 requires ACCESS_COARSE_LOCATION permissions to find unpaired devices. 
        // Permissions can be requested by using the hasPermission and requestPermission functions.
        if (this.isAndroidApi23AndMore() && !tthis.hasPermission && !tthis.isLocationEnabled) {
            if (!tthis.hasPermission) {

                tthis.bleComponent.hasPermission((status) => {
                    console.log('AttendanceBleService > hasPermission() > status: ' + JSON.stringify(status));
                    tthis.hasPermission = status.hasPermission;
                    if (!tthis.hasPermission) {
                        tthis.bleComponent.requestPermission(
                            (status) => {
                                console.log('AttendanceBleService > requestPermission() > S > status: ' + JSON.stringify(status));
                                if (status.requestPermission) {
                                    tthis.manageLocation();
                                } else {
                                    tthis._events.ble.requestPermissionDeny().publish();
                                }
                            },
                            (status) => {
                                console.log('AttendanceBleService > requestPermission() > E > status: ' + JSON.stringify(status));
                                tthis._events.ble.requestPermissionDeny().publish(status.requestPermission);
                            }
                        );
                    } else {
                        tthis.manageLocation();
                    }
                });
            } else if (!tthis.isLocationEnabled) {
                tthis.manageLocation();
            } else {
                tthis.startScanning();
            }
        } else {
            tthis.scanByPlatform();
        }
    }

    scanByPlatform(): void {
        console.log('AttendanceBleService > scanByPlatform()');
        let tthis = this;
        if (this.isAndroid()) {
            this.bleComponent.startScanForAndroid()
                .subscribe(
                result => {
                    tthis.startScanCallback(result);
                },
                error => tthis.stopScan());
        } else if (this.isiOS()) {
            tthis.bleComponent.startScanForiOS(new BeaconModel(this.officeBeacon))
                .then((result: any) => {
                    tthis.startScanCallback(result);
                })
                .catch(() => {
                    tthis.stopScan();
                });
        }

        setTimeout(function () {
            tthis.stopScan();
        }, SCANNING_DELAY);
    }

    /**
     * Returns <code>true</code> if the Android version is greather than API 23, i.e., 6.0
     */
    isAndroidApi23AndMore(): boolean {
        let isAndroidApi23AndMore: boolean = this.isAndroid() && parseFloat(Device.prototype.version) >= 6.0;
        console.debug('AttendanceBleService > isAndroidApi23AndMore(): ' + isAndroidApi23AndMore);
        return isAndroidApi23AndMore;
    }

    /**
     * Location Services are required to find devices in Android API 23.
     */
    manageLocation(): void {
        let tthis = this;
        console.log('AttendanceBleService > manageLocation() > isLocationEnabled: ' + tthis.isLocationEnabled);

        if (tthis.isAndroidApi23AndMore() && !tthis.isLocationEnabled) {
            console.log('AttendanceBleService > manageLocation() > isLocationEnabled: ' + tthis.isLocationEnabled);
            tthis.bleComponent.isLocationEnabled(
                function (status) {
                    console.log('AttendanceBleService > isLocationEnabled() > S > status: ' + JSON.stringify(status));
                    tthis.isLocationEnabled = status.isLocationEnabled;
                    !tthis.isLocationEnabled ? tthis.requestLocation() : tthis.startScanning();
                },
                function (err) {
                    console.error('AttendanceBleService > isLocationEnabled() > error: ' + JSON.stringify(err));
                }
            );
        } else {
            tthis.startScanning();
        }
    }

    requestLocation() {
        let tthis = this;
        tthis.bleComponent.requestLocation(
            function (status) {
                console.log('AttendanceBleService > requestLocation() > S > status: ' + JSON.stringify(status));
                tthis.isLocationEnabled = status.requestLocation;
                if (tthis.isLocationEnabled) {
                    tthis._events.ble.requestLocationEnabled().publish();
                } else {
                    tthis._events.ble.requestLocationDisabled().publish();
                }
            },
            function (err) {
                console.error('AttendanceBleService > requestLocation() > error: ' + JSON.stringify(err));
            }
        );
    }

    /**
     * Manage result for each platform 
     */
    startScanCallback(result: any) {
        console.debug(`AttendanceBleService > StartScanCallback() > results: ${JSON.stringify(result)}`);

        let tthis = this;

        if (this.isAndroid()) {
            let androidResult: AndroidScanResult = result;
            if (_.isEqual(androidResult.status, 'scanResult')) {
                if (_.isEqual(this.officeBeacon.mac_address, androidResult.address)) {
                    tthis.beaconDetected = {
                        "advertisement": androidResult.advertisement, "name": androidResult.name,
                        "address": androidResult.address, "rssi": androidResult.rssi
                    };
                }
            }
        } else if (this.isiOS()) {
            let iosResult: iosScanResult = result;
            this.beaconDetected = {
                "major": iosResult.major, "accuracy": iosResult.accuracy,
                "minor": iosResult.minor, "rssi": iosResult.rssi
            };
        }

        if (!_.isNull(this.beaconDetected)) {
            // Right beacon detected: publish detection event and stop scan  
            this._events.ble.beaconDetected().publish();
            this.stopScan();
        }
    }

    stopScan() {
        console.log('AttendanceBleService > stopScan()');
        let callback = () => {
            console.log('AttendanceBleService > stopScan() > callback()');
            if (_.isEmpty(this.beaconDetected)) {
                this._events.ble.beaconNotDetected().publish();
            }
        };
        this.bleComponent.stopScan(callback, callback, this.isAndroid());
    }

    formatMacAddress(estimoteMacAddress: string): string {
        let fma: string = estimoteMacAddress.substring(0, 2).toUpperCase() + ":" + estimoteMacAddress.substring(2, 4).toUpperCase() + ":" +
            estimoteMacAddress.substring(4, 6).toUpperCase() + ":" + estimoteMacAddress.substring(6, 8).toUpperCase() + ":" +
            estimoteMacAddress.substring(8, 10).toUpperCase() + ":" + estimoteMacAddress.substring(10, 12).toUpperCase();
        console.debug('AttendanceBleService > formatMacAddress > fma: ' + fma);
        return fma;
    }

}

export interface BeaconDevice {
    advertisement?: string;
    name?: string;
    address?: string;
    major?: number;
    minor?: number;
    uuid?: number;
    rssi: number;
    measuredPower?: number;
    firmwareState?: number;
    accuracy?: number;
}

interface AndroidScanResult {
    status: string;
    address?: string;
    name?: string;
    rssi?: number;
    advertisement?: string;
}

interface iosScanResult {
    major: number;
    minor: number;
    uuid: string;
    rssi: number;
    accuracy: number;
}
