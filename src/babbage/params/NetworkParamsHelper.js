import { None, expectSome, isNone } from "@helios-lang/type-utils"
import { DEFAULT_NETWORK_PARAMS } from "./NetworkParams.js"

/**
 * @typedef {import("./NetworkParams.js").NetworkParams} NetworkParams
 */

/**
 * @typedef {() => bigint} LiveSlotGetter
 */

/**
 * Wrapper for the raw JSON containing all the current network parameters.
 *
 * NetworkParamsHelper is needed to be able to calculate script budgets and perform transaction building checks.
 */
export class NetworkParamsHelper {
    /**
     * @readonly
     * @type {NetworkParams}
     */
    params

    /**
     * Should only be set by the network emulator
     * @private
     * @type {Option<LiveSlotGetter>}
     */
    liveSlotGetter

    /**
     * @param {NetworkParams} params
     * @param {Option<LiveSlotGetter>} liveSlotGetter
     */
    constructor(params, liveSlotGetter = None) {
        this.params = params
        this.liveSlotGetter = liveSlotGetter
    }

    /**
     *
     * @param {Option<NetworkParams | NetworkParamsHelper>} params
     */
    static fromAlikeOrDefault(params = None) {
        if (!params) {
            return new NetworkParamsHelper(DEFAULT_NETWORK_PARAMS)
        } else if (params instanceof NetworkParamsHelper) {
            return params
        } else {
            return new NetworkParamsHelper(params)
        }
    }

    /**
     * @type {Object}
     */
    get costModel() {
        const model = this.params?.latestParams?.costModels?.PlutusScriptV2

        if (!model) {
            throw new Error(
                "'networkParams.latestParams.costModels.PlutusScriptV2' undefined"
            )
        }

        return model
    }

    /**
     * @type {Option<bigint>}
     */
    get liveSlot() {
        if (this.liveSlotGetter) {
            return this.liveSlotGetter()
        } else {
            return None
        }
    }

    /**
     * @type {[number, number]} - a + b*txSize
     */
    get txFeeParams() {
        return [
            expectSome(
                this.params?.latestParams?.txFeeFixed,
                "'networkParams.latestParams.txFeeFixed' undefined"
            ),
            expectSome(
                this.params?.latestParams?.txFeePerByte,
                "'networkParams.latestParams.txFeePerByte' undefined"
            )
        ]
    }

    /**
     * @type {[number, number]} - [memPrice, cpuPrice]
     */
    get exFeeParams() {
        return [
            expectSome(
                this.params?.latestParams?.executionUnitPrices?.priceMemory,
                "'networkParams.latestParams.executionUnitPrices.priceMemory' undefined"
            ),
            expectSome(
                this.params?.latestParams?.executionUnitPrices?.priceSteps,
                "'networkParams.latestParams.executionUnitPrices.priceSteps' undefined"
            )
        ]
    }

    /**
     * @type {number}
     */
    get lovelacePerUTXOByte() {
        return expectSome(
            this.params?.latestParams?.utxoCostPerByte,
            "'networkParams.latestParams.utxoCostPerByte' undefined"
        )
    }

    /**
     * @type {number}
     */
    get minCollateralPct() {
        return expectSome(
            this.params?.latestParams?.collateralPercentage,
            "'networkParams.latestParmas.collateralPercentage' undefined"
        )
    }

    /**
     * @type {number}
     */
    get maxCollateralInputs() {
        return expectSome(
            this.params?.latestParams?.maxCollateralInputs,
            "'networkParams.latestParams.maxCollateralInputs' undefined"
        )
    }

    /**
     * @type {[number, number]} - [mem, cpu]
     */
    get maxTxExecutionBudget() {
        return [
            expectSome(
                this.params?.latestParams?.maxTxExecutionUnits?.memory,
                "'networkParams.latestParams.maxTxExecutionUnits.memory' undefined"
            ),
            expectSome(
                this.params?.latestParams?.maxTxExecutionUnits?.steps,
                "'networkParams.latestParams.maxTxExecutionUnits.steps' undefined"
            )
        ]
    }

    /**
     * Tx balancing picks additional inputs by starting from maxTxFee.
     * This is done because the order of the inputs can have a huge impact on the tx fee, so the order must be known before balancing.
     * If there aren't enough inputs to cover the maxTxFee and the min deposits of newly created UTxOs, the balancing will fail.
     * @type {bigint}
     */
    get maxTxFee() {
        const [a, b] = this.txFeeParams
        const [feePerMem, feePerCpu] = this.exFeeParams
        const [maxMem, maxCpu] = this.maxTxExecutionBudget

        return (
            BigInt(a) +
            BigInt(Math.ceil(b * this.maxTxSize)) +
            BigInt(Math.ceil(feePerMem * maxMem)) +
            BigInt(Math.ceil(feePerCpu * maxCpu))
        )
    }

    /**
     * @type {number}
     */
    get maxTxSize() {
        return expectSome(
            this.params?.latestParams?.maxTxSize,
            "'networkParams.latestParams.maxTxSize' undefined"
        )
    }

    /**
     * @type {number}
     */
    get secondsPerSlot() {
        return expectSome(
            this.params?.shelleyGenesis?.slotLength,
            "'networkParams.shelleyGenesis.slotLength' undefined"
        )
    }

    /**
     * @type {bigint}
     */
    get stakeAddressDeposit() {
        return BigInt(
            expectSome(
                this.params?.latestParams?.stakeAddressDeposit,
                "'networkParams.latestParams.stakeAddressDeposit' undefined"
            )
        )
    }

    /**
     * @private
     * @type {bigint}
     */
    get latestTipSlot() {
        return BigInt(
            expectSome(
                this.params?.latestTip?.slot,
                "'networkParams.latestTip.slot' undefined"
            )
        )
    }

    /**
     * @private
     * @type {bigint}
     */
    get latestTipTime() {
        return BigInt(
            expectSome(
                this.params?.latestTip?.time,
                "'networkParams.latestTip.time' undefined"
            )
        )
    }

    /**
     * Needed when calculating the scriptDataHash inside the TxBuilder
     * @type {number[]}
     */
    get sortedV2CostParams() {
        let baseObj = this.params?.latestParams?.costModels?.PlutusScriptV2
        let keys = Object.keys(baseObj)

        keys.sort()

        return keys.map((key) => baseObj[key])
    }

    /**
     * Calculates the time (in milliseconds in 01/01/1970) associated with a given slot number.
     * @param {bigint} slot
     * @returns {number}
     */
    slotToTime(slot) {
        const slotDiff = slot - this.latestTipSlot

        return Number(
            this.latestTipTime + slotDiff * BigInt(this.secondsPerSlot * 1000)
        )
    }

    /**
     * Calculates the slot number associated with a given time. Time is specified as milliseconds since 01/01/1970.
     * @param {number} time Milliseconds since 1970
     * @returns {bigint}
     */
    timeToSlot(time) {
        const timeDiff = BigInt(time) - this.latestTipTime

        return (
            this.latestTipSlot +
            BigInt(Math.round(Number(timeDiff) / (1000 * this.secondsPerSlot)))
        )
    }
}