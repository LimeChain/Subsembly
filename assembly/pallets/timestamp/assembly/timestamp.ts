import { Bool, ByteArray, BytesReader } from 'as-scale-codec';
import { InherentData, Log, ResponseCodes, Storage, Utils } from 'subsembly-core';
import { InherentType, Moment, TimestampConfig } from '../../../runtime/runtime';

/**
 * @description The Timestamp pallet provides functionality to get and set the on-chain time.
 */
export class Timestamp {
    /**
     * Scale encoded key {scale("timestamp")}{scale("now")} 
     * Scale encoded key {scale("timestamp")}{scale("didupdate")} 
     */
    public static readonly SCALE_TIMESTAMP_NOW: u8[] = [36, 116, 105, 109, 101, 115, 116, 97, 109, 112, 12, 110, 111, 119];
    public static readonly SCALE_TIMESTAMP_DID_UPDATE: u8[] = [36, 116, 105, 109, 101, 115, 116, 97, 109, 112, 36, 100, 105, 100, 117, 112, 100, 97, 116, 101];
    public static readonly INHERENT_IDENTIFIER: string = "timstap0";

    /**
     * Call index for timestamp inherent
     */
    public static readonly CALL_INDEX: u8[] = [2, 0];
    /**
     * Runtime API version
     */
    public static readonly API_VERSION: u8 = 4;
    /**
     * Module prefix
     */
    public static readonly PREFIX: u8 = 11;

    /**
     * index of the timestamp module
     */
    public static readonly MODULE_INDEX: u8 = 1;

    /**
     * @description Toggles the current value of didUpdate
     */
    static _toggleUpdate(): void {
        const didUpdate = Storage.get(Timestamp.SCALE_TIMESTAMP_DID_UPDATE);
        const didUpdateValue: Bool = didUpdate.isSome() ? BytesReader.decodeInto<Bool>((<ByteArray>didUpdate.unwrap()).unwrap()) : new Bool(false);
        if (didUpdateValue.unwrap()) {
            const falseu8 = new Bool(false);
            Storage.set(Timestamp.SCALE_TIMESTAMP_DID_UPDATE, falseu8.toU8a());
        }
        else {
            const trueu8 = new Bool(true);
            Storage.set(Timestamp.SCALE_TIMESTAMP_DID_UPDATE, trueu8.toU8a());
        }
    }

    /**
     * @description Sets the current time. When setting the new time, 
     * it must be greater than the last one (set into storage) with at least a MinimumPeriod
     * @param now timestamp number
     */
    static set(now: Moment): u8[] {
        const didUpdate = Storage.get(Timestamp.SCALE_TIMESTAMP_DID_UPDATE);
        const didUpdateValue: Bool = didUpdate.isSome() ? BytesReader.decodeInto<Bool>((<ByteArray>didUpdate.unwrap()).unwrap()) : new Bool(false);
        if (didUpdateValue.unwrap()) {
            Log.error('Validation error: Timestamp must be updated only once in the block');
            return this._tooFrequentResponseCode();
        }
        let minValue = Timestamp._get().unwrap() + TimestampConfig.minimumPeriod().unwrap();
        if (now.unwrap() < minValue) {
            Log.error('Validation error: Timestamp must increment by at least <MinimumPeriod> between sequential blocks');
            return this._timeframeTooLowResponceCode();
        }

        const trueu8 = new Bool(true);
        Storage.set(Timestamp.SCALE_TIMESTAMP_DID_UPDATE, trueu8.toU8a());
        Storage.set(Timestamp.SCALE_TIMESTAMP_NOW, now.toU8a());
        return ResponseCodes.SUCCESS;
    }

    /**
     *  @description Gets the current time that was set. If this function is called prior 
     *  to setting the timestamp, it will return the timestamp of the previous block.
     */
    static _get(): Moment {
        const now = Storage.get(Timestamp.SCALE_TIMESTAMP_NOW);
        return now.isSome() ? BytesReader.decodeInto<Moment>((<ByteArray>now.unwrap()).unwrap()) : instantiate<Moment>(0);
    }

    /**
     * @description Creates timestamp inherent data
     * @param data inherent data to extract timestamp from
     */
    static _createInherent(data: InherentData<ByteArray>): InherentType {
        const timestampData: Moment = BytesReader.decodeInto<Moment>(this._extractInherentData(data).unwrap());
        let nextTime = timestampData;

        if (Timestamp._get().unwrap()) {
            let nextTimeValue = timestampData.unwrap() > Timestamp._get().unwrap() + TimestampConfig.minimumPeriod().unwrap()
                ? timestampData.unwrap() : Timestamp._get().unwrap() + TimestampConfig.minimumPeriod().unwrap();

            nextTime = instantiate<Moment>(nextTimeValue);
        }
        const inherent = instantiate<InherentType>(
            Timestamp.CALL_INDEX,
            Timestamp.API_VERSION,
            Timestamp.PREFIX,
            nextTime
        );
        return inherent;
    }

    /**
     * @description Checks if the new value can be set as inherent data
     * @param t new value of the timestamp inherent data
     * @param data inherent data to extract timestamp from
     */
    static _checkInherent(t: Moment, data: InherentData<ByteArray>): bool {
        const MAX_TIMESTAMP_DRIFT_MILLS: Moment = instantiate<Moment>(30 * 1000);
        const timestampData: Moment = BytesReader.decodeInto<Moment>(this._extractInherentData(data).unwrap());
        const minimum: Moment = instantiate<Moment>(Timestamp._get().unwrap() + TimestampConfig.minimumPeriod().unwrap());
        if (t.unwrap() > timestampData.unwrap() + MAX_TIMESTAMP_DRIFT_MILLS.unwrap()) {
            return false;
        }
        else if (t.unwrap() < minimum.unwrap()) {
            return false;
        }
        else {
            return true;
        }
    }

    /**
     * @description Applies given inherent
     * @param inherent 
     */
    static _applyInherent(inherent: InherentType): u8[] {
        const resCode = Timestamp.set((<Moment>inherent.getArgument()));
        if (Utils.areArraysEqual(resCode, ResponseCodes.SUCCESS)) {
            Timestamp._toggleUpdate();
        }
        return resCode;
    }

    /**
     * @description Construct too frequent response error
     */
    static _tooFrequentResponseCode(): u8[] {
        return ResponseCodes.dispatchError(this.MODULE_INDEX, 1);
    }

    /**
     * @description Construct too low response error
     */
    static _timeframeTooLowResponceCode(): u8[] {
        return ResponseCodes.dispatchError(this.MODULE_INDEX, 2);
    }

    /**
     * @description Gets timestamp inherent data
     * @param inhData inherentData instance provided 
     */
    static _extractInherentData(inhData: InherentData<ByteArray>): ByteArray {
        return inhData.getData().get(Timestamp.INHERENT_IDENTIFIER);
    }
}