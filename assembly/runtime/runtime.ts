import { ByteArray, CompactInt, Hash, UInt128, UInt32, UInt64 } from "as-scale-codec";
import {
    AccountId, Block, DigestItem, Extrinsic, ExtrinsicData, Header, Inherent,
    RuntimeVersion, Signature, SignedTransaction, Storage, SupportedAPIs, Utils
} from "subsembly-core";

/**
 * General Runtime types
 */
export type BlockNumber = CompactInt;
export type AccountIdType = AccountId;
export type SignatureType = Signature;
export type HashType = Hash;
export type DigestItemType = DigestItem;
export type Balance = UInt128;
export type HeaderType = Header<BlockNumber, HashType>;
export type UncheckedExtrinsic = Extrinsic;
export type BlockType = Block<HeaderType, UncheckedExtrinsic>;
export type Moment = UInt64;
export type NonceType = UInt64;
export type AmountType = UInt64;
export type ExtrinsicIndex = UInt32;
export type SignedTransactionType = SignedTransaction<HashType, AmountType, NonceType, SignatureType>;
export type InherentType = Inherent<Moment>;
export type ExtrinsicDataType = ExtrinsicData<ExtrinsicIndex, ByteArray>;

/**
 * @description Runtime specific methods
 */
export namespace Runtime{
    /**
     * @description Metadata of the runtime
     */
    export function metadata(): u8[]{
        // returns hard-coded value, currently
        return [0x6d, 0x65, 0x74, 0x61, 9];
    }
    /**
     * @description Steps to take after the runtime Initialization
     */
    export function initialize(): void{
        // when the runtime is initialized, set the maximum number of block hashes to store
        const bhshCount = RuntimeConstants.blockHashCount();
        Storage.set(Utils.stringsToBytes(RuntimeConstants.BHSH_COUNT), bhshCount.toU8a());
    }
}

/**
 * @description Constants for runtime
 */
export class RuntimeConstants {
    static readonly BHSH_COUNT: string[] = ["system", "bhash_cout"];
    /**
     * @description Instanciates new RuntimeVersion Configration
    */
    static runtimeVersion(): RuntimeVersion{
        const SPEC_NAME: string = "node-template";
        const IMPL_NAME: string = "AssemblyScript"
        const AUTHORING_VERSION: u32 = 1;
        const SPEC_VERSION: u32 = 1;
        const IMPL_VERSION: u32 = 1;

        const APIS_VEC: SupportedAPIs = new SupportedAPIs();
        APIS_VEC.addAPI([1, 1, 1, 1, 1, 1, 1, 1], 10);
        
        const TRANSACTION_VERSION: u32 = 1;

        return new RuntimeVersion(
            SPEC_NAME,
            IMPL_NAME,
            AUTHORING_VERSION,
            SPEC_VERSION,
            IMPL_VERSION,
            APIS_VEC,
            TRANSACTION_VERSION
        );
    };
        
    /**
     * @description Number of block hashes to store in the storage, pruning starts with the oldest block 
    */
    static blockHashCount(): BlockNumber{
        return instantiate<BlockNumber>(1000);
    }
}

/**
 * @description Types and constants used in Timestamp pallet
 */
export class TimestampConfig{
    /**
     * @description Minimum period between timestamps
     */
    static minimumPeriod(): Moment{
        return instantiate<Moment>(5000);
    }
}