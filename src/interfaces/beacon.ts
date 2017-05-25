import { GetBeaconResponse } from '../services/beacon';
import _ from 'lodash';

export class BeaconModel {

    id: number
    mac_address: string;
    uuid: string;
    major: number;
    minor: number;
    rssi: number;
    // place_id: number;

    constructor(beacon?: GetBeaconResponse) {
        if (beacon) {
            this.id = beacon.id;
            this.mac_address = beacon.mac_address;
            this.uuid = beacon.uuid;
            this.major = beacon.major;
            this.minor = beacon.minor;
        }
    }

    public static hydrate(data: GetBeaconResponse[]): BeaconModel[] {
        let array: BeaconModel[] = [];
        let element: BeaconModel;
        for (let key in data) {
            element = new BeaconModel(data[key]);
            // array[element.id] = element;
            array.push(element);
        }

        return array;
    }

    public isSameBeacon(uuid: string, major: number, minor: number) {
        return _.isEqual(this.uuid, uuid) && _.isEqual(this.major, major) && _.isEqual(this.minor, minor);
    }
}