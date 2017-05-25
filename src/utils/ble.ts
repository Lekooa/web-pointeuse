import { IBeacon } from '@ionic-native/ibeacon';
import { BeaconModel } from '../interfaces/beacon';
import _ from 'lodash';
import { Observable } from 'rxjs/Observable';

declare let bluetoothle;

export class BleComponent {

    /* STATIC */
    static instance: BleComponent;
    static isCreating: Boolean = false;
    public SCAN_MODE_OPPORTUNISTIC = -1;
    public SCAN_MODE_LOW_POWER = 0;
    public SCAN_MODE_BALANCED = 1;
    public SCAN_MODE_LOW_LATENCY = 2;
    public MATCH_NUM_ONE_ADVERTISEMENT = 1;
    public MATCH_NUM_FEW_ADVERTISEMENT = 2;
    public MATCH_NUM_MAX_ADVERTISEMENT = 3;
    public MATCH_MODE_AGGRESSIVE = 1;
    public MATCH_MODE_STICKY = 2;
    public CALLBACK_TYPE_ALL_MATCHES = 1;
    public CALLBACK_TYPE_FIRST_MATCH = 2;
    public CALLBACK_TYPE_MATCH_LOST = 4;

    /* ATTRIBUTS */
    public ble: any;
    private beaconRegion: any;

    constructor() {
        console.log('BleComponent > constructor()');
        if (!BleComponent.isCreating) {
            throw new Error("You can't call new in Singleton instances! Call BleComponent.getInstance() instead.");
        }
    }

    public static getInstance() {
        if (BleComponent.instance == null) {
            BleComponent.isCreating = true;
            BleComponent.instance = new BleComponent();
            BleComponent.instance.ble = bluetoothle;
            BleComponent.isCreating = false;
        }
        return BleComponent.instance;
    }

	/**
	 * Initialize Bluetooth on the device. Must be called before anything else. 
	 * Callback will continuously be used whenever Bluetooth is enabled or disabled.
	 * https://github.com/randdusing/cordova-plugin-bluetoothle#initialize 
	 */
    public initialize(successCallback, params) {
        this.ble.initialize(successCallback, params);
    }

	/** 
	 * Enable Bluetooth on the device. Android support only.
	 * @see https://github.com/randdusing/cordova-plugin-bluetoothle#enable
	*/
    public enable(successCallback, errorCallback) {
        this.ble.enable(successCallback, errorCallback);
    }

	/** 
	 * Disable Bluetooth on the device. Android support only.
	 * @see https://github.com/randdusing/cordova-plugin-bluetoothle#disable
	*/
    public disable(successCallback, errorCallback) {
        this.ble.disable(successCallback, errorCallback);
    }

	/**
	 * @see https://github.com/randdusing/cordova-plugin-bluetoothle#startscan
	 */
    public startScanForAndroid(): Observable<any> {
        console.log('ble > startScanForAndroid()');
        return Observable.create(observer => {
            this.ble.startScan(
                function (result) {
                    console.log('ble > startScanForAndroid() > result:' + JSON.stringify(result));
                    if (_.isEqual(result.status, 'scanResult')) {
                        observer.next(result);
                    }
                },
                function (error) {
                    console.log('ble > startScanForAndroid() > error:' + JSON.stringify(error));
                },
                {});
        });
    }

	/**
	 * @see https://github.com/petermetz/cordova-plugin-ibeacon
	 * @see https://github.com/petermetz/cordova-plugin-ibeacon/issues/140
	 */
    public startScanForiOS(beacon: BeaconModel): Promise<any> {
        console.log('ble > startScanForiOS() > beacon: ' + JSON.stringify(beacon));

        return new Promise((resolve: any, reject: any) => {

            if (_.isEmpty(beacon.uuid) || _.isEmpty(beacon.major) || _.isEmpty(beacon.minor)) {
                reject();
            }

            this.beaconRegion = IBeacon.prototype.BeaconRegion('deskBeacon', beacon.uuid, beacon.major, beacon.minor);

            // Request permission to use location on iOS
            IBeacon.prototype.requestAlwaysAuthorization();

            // create a new delegate and register it with the native layer
            let delegate = IBeacon.prototype.Delegate();

            delegate.didDetermineStateForRegion()
                .subscribe(
                data => {
                    // console.log('didDetermineStateForRegion: ', JSON.stringify(data));
                    IBeacon.prototype.startRangingBeaconsInRegion(this.beaconRegion)
                        .then(
                        () => console.log('Native layer recieved the request to ranging'),
                        error => {
                            console.error('Native layer failed to begin ranging: ', error);
                            reject();
                        });
                },
                error => console.error());

            delegate.didRangeBeaconsInRegion()
                .subscribe(
                data => {
                    // console.log('didRangeBeaconsInRegion: ', JSON.stringify(data));
                    if (!_.isEmpty(data) && !_.isEmpty(data.beacons)) {
                        _.forEach(data.beacons, function (beacon) {
                            if (_.isEqual(beacon.proximity, "ProximityNear") || _.isEqual(beacon.proximity, "ProximityImmediate")) {
                                console.log('didRangeBeaconsInRegion > beacon: ', JSON.stringify(beacon));
                                resolve({ beacon: beacon});
                            }
                        });
                    }
                },
                error => console.error()
                );

            IBeacon.prototype.setDelegate(delegate);
            IBeacon.prototype.requestWhenInUseAuthorization();
            IBeacon.prototype.startMonitoringForRegion(this.beaconRegion)
                .then(
                () => console.log('Native layer recieved the request to monitoring'),
                error => {
                    console.error('Native layer failed to begin monitoring: ', error);
                    reject();
                });

        });
    }

    public stopScan(successCallback, errorCallback, isAndroid: boolean) {
        console.log('ble > stopScan()');
        if (isAndroid) {
            this.ble.stopScan(successCallback, errorCallback, {});
        } else {
            IBeacon.prototype.stopRangingBeaconsInRegion(this.beaconRegion)
                .then(() => successCallback())
                .catch(() => errorCallback());
            IBeacon.prototype.stopMonitoringForRegion(this.beaconRegion);
        }
    }

    public retrieveConnected(successCallback, errorCallback, params) {
        this.ble.retrieveConnected(successCallback, errorCallback);
    }

    public connect(successCallback, errorCallback, params) {
        this.ble.connect(successCallback, errorCallback);
    }

    public reconnect(successCallback, errorCallback, params) {
        this.ble.reconnect(successCallback, errorCallback);
    }

    public disconnect(successCallback, errorCallback, params) {
        this.ble.disconnect(successCallback, errorCallback);
    }

    public close(successCallback, errorCallback, params) {
        this.ble.close(successCallback, errorCallback);
    }

    public hasPermission(hasPermissionSuccess) {
        this.ble.hasPermission(hasPermissionSuccess);
    }

    public requestPermission(requestPermissionSuccess, requestPermissionError) {
        this.ble.requestPermission(requestPermissionSuccess, requestPermissionError);
    }

	/**
	 * Determine if location services are enabled or not. Location Services are required to find devices in Android API 23.
	 */
    public isLocationEnabled(isLocationEnabledSuccess, isLocationEnabledError) {
        this.ble.isLocationEnabled(isLocationEnabledSuccess, isLocationEnabledError);
    }

	/** 
	 * Prompt location services settings pages. requestLocation property returns whether location services are enabled or disabled. 
	 * Location Services are required to find devices in Android API 23.
	*/
    public requestLocation(requestLocationSuccess, requestLocationError) {
        this.ble.requestLocation(requestLocationSuccess, requestLocationError);
    }

}