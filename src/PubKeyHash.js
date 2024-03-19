import { decodeBytes, encodeBytes } from "@helios-lang/cbor"
import { bytesToHex, hexToBytes, toBytes } from "@helios-lang/codec-utils"
import { ByteArrayData, decodeUplcData } from "@helios-lang/uplc"

/**
 * @typedef {import("@helios-lang/codec-utils").ByteArrayLike} ByteArrayLike
 * @typedef {import("@helios-lang/uplc").UplcData} UplcData
 * @typedef {import("./Hash.js").Hash} Hash
 */

/**
 * Represents a blake2b-224 hash of a PubKey
 *
 * **Note**: A `PubKeyHash` can also be used as the second part of a payment `Address`, or to construct a `StakeAddress`.
 * @implements {Hash}
 */
export class PubKeyHash {
    /**
     * @readonly
     * @type {number[]}
     */
    bytes

    /**
     * @param {ByteArrayLike} bytes
     */
    constructor(bytes) {
        this.bytes = toBytes(bytes)

        if (this.bytes.length != 28) {
            throw new Error(
                `expected 28 bytes for PubKeyHash, got ${this.bytes.length}`
            )
        }
    }

    /**
     * @returns {PubKeyHash}
     */
    static dummy() {
        const bytes = new Array(28).fill(0)

        return new PubKeyHash(bytes)
    }

    /**
     * @param {PubKeyHash | ByteArrayLike} arg
     * @returns {PubKeyHash}
     */
    static from(arg) {
        return arg instanceof PubKeyHash ? arg : new PubKeyHash(arg)
    }

    /**
     * @param {number[]} bytes
     * @returns {PubKeyHash}
     */
    static fromCbor(bytes) {
        return new PubKeyHash(decodeBytes(bytes))
    }

    /**
     * @param {UplcData} data
     * @returns {PubKeyHash}
     */
    static fromUplcData(data) {
        return new PubKeyHash(ByteArrayData.expect(data).bytes)
    }

    /**
     * @param {string | number[]} bytes
     * @returns {PubKeyHash}
     */
    static fromUplcCbor(bytes) {
        return PubKeyHash.fromUplcData(decodeUplcData(bytes))
    }

    /**
     * @returns {number[]}
     */
    toCbor() {
        return encodeBytes(this.bytes)
    }

    /**
     * @returns {string}
     */
    toHex() {
        return bytesToHex(this.bytes)
    }

    /**
     * Hexadecimal representation.
     * @returns {string}
     */
    toString() {
        return this.toHex()
    }

    /**
     * @returns {ByteArrayData}
     */
    toUplcData() {
        return new ByteArrayData(this.bytes)
    }
}
