import { Events } from 'ionic-angular';

export class EventsManager extends Events {

    public ble: BleEvent;

    constructor() {
        super();

        this.ble = new BleEvent(this);
    }
}

/*
 *  EVENTS TYPES
 */
export abstract class ParentEvent {
    public identifier: string;
    public eventManager: EventsManager;

    constructor(eventManager: EventsManager, identifier: string) {
        this.eventManager = eventManager;
        this.identifier = identifier;
    }
}

export class BleEvent extends ParentEvent {
    constructor(eventManager: EventsManager) {
        super(eventManager, 'ble')
    }

    public initializing() {
        return new EventHandler(this, 'initializing');
    }
    public enabling() {
        return new EventHandler(this, 'enabling');
    }
    public enabled() {
        return new EventHandler(this, 'enabled');
    }
    public disabling() {
        return new EventHandler(this, 'disabling');
    }
    public disabled() {
        return new EventHandler(this, 'disabled');
    }
    public requestPermissionDeny() {
        return new EventHandler(this, 'requestPermissionDeny');
    }
    public requestLocation() {
        return new EventHandler(this, 'requestLocation');
    }
    public requestLocationEnabled() {
        return new EventHandler(this, 'requestLocationEnabled');
    }
    public requestLocationDisabled() {
        return new EventHandler(this, 'requestLocationDisabled');
    }
    public beaconDetected() {
        return new EventHandler(this, 'addinbeaconDetectedgError');
    }
    public beaconNotDetected() {
        return new EventHandler(this, 'beaconNotDetected');
    }
    public deviceNotBleCompatible() {
        return new EventHandler(this, 'deviceNotBleCompatible');
    }
    public deviceIdNotEqual() {
        return new EventHandler(this, 'deviceIdNotEqual');
    }
    public onSignature() {
        return new EventHandler(this, 'onSignature');
    }
    public onSignatureClear() {
        return new EventHandler(this, 'onSignatureClear');
    }
    public onSignatureMissing() {
        return new EventHandler(this, 'onSignatureMissing');
    }
    public onEmargementError() {
        return new EventHandler(this, 'onEmargementError');
    }
}

/**
 * Event handler
 */
export class EventHandler {
    private eventMan: EventsManager;
    private topic: string;
    private handler: Function;

    constructor(parentEvent: ParentEvent, action: string) {
        this.eventMan = parentEvent.eventManager;
        this.topic = parentEvent.identifier + ':' + action;
    }

    public subscribe(handler: Function): EventHandler {
        // console.debug('EventManager > listen > ' + this.topic);
        this.handler = handler;
        this.eventMan.subscribe(this.topic, this.handler);

        return this;
    }

    public unsubscribe(): void {
        // console.debug('EventManager > stopListen > ' + this.topic);
        this.eventMan.unsubscribe(this.topic, this.handler);
    }

    public publish(...args: any[]): void {
        // console.debug('EventManager > emit > ' + this.topic);
        this.eventMan.publish(this.topic, args);
    }
}
