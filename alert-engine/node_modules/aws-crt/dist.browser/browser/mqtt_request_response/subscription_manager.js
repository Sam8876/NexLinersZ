"use strict";
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionManager = exports.acquireSubscriptionResultToString = exports.AcquireSubscriptionResult = exports.SubscriptionType = exports.SubscriptionEventType = void 0;
var event_1 = require("../../common/event");
var protocol_adapter = __importStar(require("./protocol_adapter"));
var io = __importStar(require("../../common/io"));
/**
 *
 * @packageDocumentation
 * @module mqtt_request_response
 *
 */
// exported for tests only
var SubscriptionEventType;
(function (SubscriptionEventType) {
    SubscriptionEventType[SubscriptionEventType["SubscribeSuccess"] = 0] = "SubscribeSuccess";
    SubscriptionEventType[SubscriptionEventType["SubscribeFailure"] = 1] = "SubscribeFailure";
    SubscriptionEventType[SubscriptionEventType["SubscriptionEnded"] = 2] = "SubscriptionEnded";
    SubscriptionEventType[SubscriptionEventType["StreamingSubscriptionEstablished"] = 3] = "StreamingSubscriptionEstablished";
    SubscriptionEventType[SubscriptionEventType["StreamingSubscriptionLost"] = 4] = "StreamingSubscriptionLost";
    SubscriptionEventType[SubscriptionEventType["StreamingSubscriptionHalted"] = 5] = "StreamingSubscriptionHalted";
    SubscriptionEventType[SubscriptionEventType["SubscriptionOrphaned"] = 6] = "SubscriptionOrphaned";
    SubscriptionEventType[SubscriptionEventType["UnsubscribeComplete"] = 7] = "UnsubscribeComplete";
})(SubscriptionEventType = exports.SubscriptionEventType || (exports.SubscriptionEventType = {}));
function subscriptionEventTypeToString(eventType) {
    switch (eventType) {
        case SubscriptionEventType.SubscribeSuccess:
            return "SubscribeSuccess";
        case SubscriptionEventType.SubscribeFailure:
            return "SubscribeFailure";
        case SubscriptionEventType.SubscriptionEnded:
            return "SubscriptionEnded";
        case SubscriptionEventType.StreamingSubscriptionEstablished:
            return "StreamingSubscriptionEstablished";
        case SubscriptionEventType.StreamingSubscriptionLost:
            return "StreamingSubscriptionLost";
        case SubscriptionEventType.StreamingSubscriptionHalted:
            return "StreamingSubscriptionHalted";
        case SubscriptionEventType.SubscriptionOrphaned:
            return "SubscriptionOrphaned";
        case SubscriptionEventType.UnsubscribeComplete:
            return "UnsubscribeComplete";
        default:
            return "Unknown";
    }
}
var SubscriptionType;
(function (SubscriptionType) {
    SubscriptionType[SubscriptionType["EventStream"] = 0] = "EventStream";
    SubscriptionType[SubscriptionType["RequestResponse"] = 1] = "RequestResponse";
})(SubscriptionType = exports.SubscriptionType || (exports.SubscriptionType = {}));
var AcquireSubscriptionResult;
(function (AcquireSubscriptionResult) {
    AcquireSubscriptionResult[AcquireSubscriptionResult["Subscribed"] = 0] = "Subscribed";
    AcquireSubscriptionResult[AcquireSubscriptionResult["Subscribing"] = 1] = "Subscribing";
    AcquireSubscriptionResult[AcquireSubscriptionResult["Blocked"] = 2] = "Blocked";
    AcquireSubscriptionResult[AcquireSubscriptionResult["NoCapacity"] = 3] = "NoCapacity";
    AcquireSubscriptionResult[AcquireSubscriptionResult["Failure"] = 4] = "Failure";
})(AcquireSubscriptionResult = exports.AcquireSubscriptionResult || (exports.AcquireSubscriptionResult = {}));
function acquireSubscriptionResultToString(result) {
    switch (result) {
        case AcquireSubscriptionResult.Subscribed:
            return "Subscribed";
        case AcquireSubscriptionResult.Subscribing:
            return "Subscribing";
        case AcquireSubscriptionResult.Blocked:
            return "Blocked";
        case AcquireSubscriptionResult.NoCapacity:
            return "NoCapacity";
        case AcquireSubscriptionResult.Failure:
            return "Failure";
        default:
            return "Unknown";
    }
}
exports.acquireSubscriptionResultToString = acquireSubscriptionResultToString;
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus[SubscriptionStatus["Subscribed"] = 0] = "Subscribed";
    SubscriptionStatus[SubscriptionStatus["NotSubscribed"] = 1] = "NotSubscribed";
})(SubscriptionStatus || (SubscriptionStatus = {}));
var SubscriptionPendingAction;
(function (SubscriptionPendingAction) {
    SubscriptionPendingAction[SubscriptionPendingAction["Nothing"] = 0] = "Nothing";
    SubscriptionPendingAction[SubscriptionPendingAction["Subscribing"] = 1] = "Subscribing";
    SubscriptionPendingAction[SubscriptionPendingAction["Unsubscribing"] = 2] = "Unsubscribing";
})(SubscriptionPendingAction || (SubscriptionPendingAction = {}));
var SubscriptionManager = /** @class */ (function (_super) {
    __extends(SubscriptionManager, _super);
    function SubscriptionManager(adapter, options) {
        var _this = _super.call(this) || this;
        _this.adapter = adapter;
        _this.options = options;
        _this.closed = false;
        _this.records = new Map();
        _this.adapter.addListener(protocol_adapter.ProtocolClientAdapter.SUBSCRIBE_COMPLETION, _this.handleSubscribeCompletionEvent.bind(_this));
        _this.adapter.addListener(protocol_adapter.ProtocolClientAdapter.UNSUBSCRIBE_COMPLETION, _this.handleUnsubscribeCompletionEvent.bind(_this));
        _this.adapter.addListener(protocol_adapter.ProtocolClientAdapter.CONNECTION_STATUS, _this.handleConnectionStatusEvent.bind(_this));
        return _this;
    }
    SubscriptionManager.prototype.close = function () {
        this.closed = true;
        this.unsubscribeAll();
    };
    SubscriptionManager.prototype.acquireSubscription = function (options) {
        var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
        if (this.closed) {
            return AcquireSubscriptionResult.Failure;
        }
        if (options.topicFilters.length == 0) {
            return AcquireSubscriptionResult.Failure;
        }
        try {
            for (var _e = __values(options.topicFilters), _f = _e.next(); !_f.done; _f = _e.next()) {
                var topicFilter = _f.value;
                var existingRecord = this.records.get(topicFilter);
                if (!existingRecord) {
                    continue;
                }
                if (existingRecord.poisoned) {
                    io.logError(SubscriptionManager.logSubject, "acquire subscription for '".concat(topicFilter, "' via operation '").concat(options.operationId, "' failed - existing subscription is poisoned and has not been released"));
                    return AcquireSubscriptionResult.Failure;
                }
                if (existingRecord.type != options.type) {
                    io.logError(SubscriptionManager.logSubject, "acquire subscription for '".concat(topicFilter, "' via operation '").concat(options.operationId, "' failed - conflicts with subscription type of existing subscription"));
                    return AcquireSubscriptionResult.Failure;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var subscriptionsNeeded = 0;
        try {
            for (var _g = __values(options.topicFilters), _h = _g.next(); !_h.done; _h = _g.next()) {
                var topicFilter = _h.value;
                var existingRecord = this.records.get(topicFilter);
                if (existingRecord) {
                    if (existingRecord.pendingAction == SubscriptionPendingAction.Unsubscribing) {
                        io.logDebug(SubscriptionManager.logSubject, "acquire subscription for '".concat(topicFilter, "' via operation '").concat(options.operationId, "' blocked - existing subscription is unsubscribing"));
                        return AcquireSubscriptionResult.Blocked;
                    }
                }
                else {
                    subscriptionsNeeded++;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
            }
            finally { if (e_2) throw e_2.error; }
        }
        if (subscriptionsNeeded > 0) {
            var stats = this.getStats();
            if (options.type == SubscriptionType.RequestResponse) {
                if (subscriptionsNeeded > this.options.maxRequestResponseSubscriptions - stats.requestResponseCount) {
                    io.logDebug(SubscriptionManager.logSubject, "acquire subscription for request operation '".concat(options.operationId, "' blocked - insufficient room"));
                    return AcquireSubscriptionResult.Blocked;
                }
            }
            else {
                if (subscriptionsNeeded + stats.streamingCount > this.options.maxStreamingSubscriptions) {
                    if (subscriptionsNeeded + stats.streamingCount <= this.options.maxStreamingSubscriptions + stats.unsubscribingStreamingCount) {
                        io.logDebug(SubscriptionManager.logSubject, "acquire subscription for streaming operation '".concat(options.operationId, "' blocked - insufficient room"));
                        return AcquireSubscriptionResult.Blocked;
                    }
                    else {
                        io.logError(SubscriptionManager.logSubject, "acquire subscription for streaming operation '".concat(options.operationId, "' failed - insufficient room"));
                        return AcquireSubscriptionResult.NoCapacity;
                    }
                }
            }
        }
        var isFullySubscribed = true;
        try {
            for (var _j = __values(options.topicFilters), _k = _j.next(); !_k.done; _k = _j.next()) {
                var topicFilter = _k.value;
                var existingRecord = this.records.get(topicFilter);
                if (!existingRecord) {
                    existingRecord = {
                        topicFilter: topicFilter,
                        listeners: new Set(),
                        status: SubscriptionStatus.NotSubscribed,
                        pendingAction: SubscriptionPendingAction.Nothing,
                        type: options.type,
                        poisoned: false,
                    };
                    this.records.set(topicFilter, existingRecord);
                }
                existingRecord.listeners.add(options.operationId);
                io.logDebug(SubscriptionManager.logSubject, "added listener '".concat(options.operationId, "' to subscription '").concat(topicFilter, "', ").concat(existingRecord.listeners.size, " listeners total"));
                if (existingRecord.status != SubscriptionStatus.Subscribed) {
                    isFullySubscribed = false;
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
            }
            finally { if (e_3) throw e_3.error; }
        }
        if (isFullySubscribed) {
            io.logDebug(SubscriptionManager.logSubject, "acquire subscription for operation '".concat(options.operationId, "' fully subscribed - all required subscriptions are active"));
            return AcquireSubscriptionResult.Subscribed;
        }
        try {
            for (var _l = __values(options.topicFilters), _m = _l.next(); !_m.done; _m = _l.next()) {
                var topicFilter = _m.value;
                var existingRecord = this.records.get(topicFilter);
                try {
                    // @ts-ignore
                    this.activateSubscription(existingRecord);
                }
                catch (err) {
                    io.logError(SubscriptionManager.logSubject, "acquire subscription for operation '".concat(options.operationId, "' failed subscription activation: ").concat(err.toString()));
                    return AcquireSubscriptionResult.Failure;
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
            }
            finally { if (e_4) throw e_4.error; }
        }
        io.logDebug(SubscriptionManager.logSubject, "acquire subscription for operation '".concat(options.operationId, "' subscribing - waiting on one or more subscriptions to complete"));
        return AcquireSubscriptionResult.Subscribing;
    };
    SubscriptionManager.prototype.releaseSubscription = function (options) {
        var e_5, _a;
        if (this.closed) {
            return;
        }
        try {
            for (var _b = __values(options.topicFilters), _c = _b.next(); !_c.done; _c = _b.next()) {
                var topicFilter = _c.value;
                this.removeSubscriptionListener(topicFilter, options.operationId);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
    };
    SubscriptionManager.prototype.purge = function () {
        var e_6, _a, e_7, _b;
        if (this.closed) {
            return;
        }
        io.logDebug(SubscriptionManager.logSubject, "purging unused subscriptions");
        var toRemove = new Array();
        try {
            for (var _c = __values(this.records), _d = _c.next(); !_d.done; _d = _c.next()) {
                var _e = __read(_d.value, 2), _ = _e[0], record = _e[1];
                if (record.listeners.size > 0) {
                    continue;
                }
                io.logDebug(SubscriptionManager.logSubject, "subscription '".concat(record.topicFilter, "' has zero listeners and is a candidate for removal"));
                if (this.adapter.getConnectionState() == protocol_adapter.ConnectionState.Connected) {
                    this.unsubscribe(record, false);
                }
                if (record.status == SubscriptionStatus.NotSubscribed && record.pendingAction == SubscriptionPendingAction.Nothing) {
                    toRemove.push(record.topicFilter);
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_6) throw e_6.error; }
        }
        try {
            for (var toRemove_1 = __values(toRemove), toRemove_1_1 = toRemove_1.next(); !toRemove_1_1.done; toRemove_1_1 = toRemove_1.next()) {
                var topicFilter = toRemove_1_1.value;
                io.logDebug(SubscriptionManager.logSubject, "deleting subscription '".concat(topicFilter, "'"));
                this.records.delete(topicFilter);
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (toRemove_1_1 && !toRemove_1_1.done && (_b = toRemove_1.return)) _b.call(toRemove_1);
            }
            finally { if (e_7) throw e_7.error; }
        }
    };
    SubscriptionManager.prototype.on = function (event, listener) {
        _super.prototype.on.call(this, event, listener);
        return this;
    };
    SubscriptionManager.prototype.getStats = function () {
        var e_8, _a;
        var stats = {
            requestResponseCount: 0,
            streamingCount: 0,
            unsubscribingStreamingCount: 0,
        };
        try {
            for (var _b = __values(this.records), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), _ = _d[0], value = _d[1];
                if (value.type == SubscriptionType.RequestResponse) {
                    stats.requestResponseCount++;
                }
                else if (value.type == SubscriptionType.EventStream) {
                    stats.streamingCount++;
                    if (value.pendingAction == SubscriptionPendingAction.Unsubscribing) {
                        stats.unsubscribingStreamingCount++;
                    }
                }
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_8) throw e_8.error; }
        }
        io.logDebug(SubscriptionManager.logSubject, "Current stats -- ".concat(stats.requestResponseCount, " request-response subscription records, ").concat(stats.streamingCount, " event stream subscription records, ").concat(stats.unsubscribingStreamingCount, " unsubscribing event stream subscriptions"));
        return stats;
    };
    SubscriptionManager.prototype.unsubscribe = function (record, isShutdown) {
        var currentlySubscribed = record.status == SubscriptionStatus.Subscribed;
        var currentlySubscribing = record.pendingAction == SubscriptionPendingAction.Subscribing;
        var currentlyUnsubscribing = record.pendingAction == SubscriptionPendingAction.Unsubscribing;
        var shouldUnsubscribe = currentlySubscribed && !currentlyUnsubscribing;
        if (isShutdown) {
            shouldUnsubscribe = shouldUnsubscribe || currentlySubscribing;
        }
        if (!shouldUnsubscribe) {
            io.logDebug(SubscriptionManager.logSubject, "subscription '".concat(record.topicFilter, "' has no listeners but is not in a state that allows unsubscribe yet"));
            return;
        }
        try {
            this.adapter.unsubscribe({
                topicFilter: record.topicFilter,
                timeoutInSeconds: this.options.operationTimeoutInSeconds
            });
        }
        catch (err) {
            io.logError(SubscriptionManager.logSubject, "synchronous unsubscribe failure for '".concat(record.topicFilter, "': ").concat(err.toString()));
            return;
        }
        io.logDebug(SubscriptionManager.logSubject, "unsubscribe submitted for '".concat(record.topicFilter, "'"));
        record.pendingAction = SubscriptionPendingAction.Unsubscribing;
    };
    SubscriptionManager.prototype.unsubscribeAll = function () {
        var e_9, _a;
        try {
            for (var _b = __values(this.records), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), _ = _d[0], value = _d[1];
                this.unsubscribe(value, true);
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_9) throw e_9.error; }
        }
    };
    SubscriptionManager.prototype.removeSubscriptionListener = function (topicFilter, operationId) {
        var _this = this;
        var record = this.records.get(topicFilter);
        if (!record) {
            return;
        }
        record.listeners.delete(operationId);
        var remainingListenerCount = record.listeners.size;
        io.logDebug(SubscriptionManager.logSubject, "removed listener '".concat(operationId, "' from '").concat(record.topicFilter, "', ").concat(remainingListenerCount, " listeners left"));
        if (remainingListenerCount > 0) {
            return;
        }
        setImmediate(function () {
            _this.emit(SubscriptionManager.SUBSCRIPTION_ORPHANED, {
                topicFilter: topicFilter
            });
        });
    };
    SubscriptionManager.prototype.emitEvents = function (record, eventType) {
        var e_10, _a;
        var _this = this;
        var _loop_1 = function (id) {
            var event_2 = {
                topicFilter: record.topicFilter,
                operationId: id,
            };
            io.logDebug(SubscriptionManager.logSubject, "emitting ".concat(subscriptionEventTypeToString(eventType), " subscription event for '").concat(record.topicFilter, "' with id ").concat(id));
            setImmediate(function () {
                switch (eventType) {
                    case SubscriptionEventType.SubscribeSuccess:
                        _this.emit(SubscriptionManager.SUBSCRIBE_SUCCESS, event_2);
                        break;
                    case SubscriptionEventType.SubscribeFailure:
                        _this.emit(SubscriptionManager.SUBSCRIBE_FAILURE, event_2);
                        break;
                    case SubscriptionEventType.SubscriptionEnded:
                        _this.emit(SubscriptionManager.SUBSCRIPTION_ENDED, event_2);
                        break;
                    case SubscriptionEventType.StreamingSubscriptionEstablished:
                        _this.emit(SubscriptionManager.STREAMING_SUBSCRIPTION_ESTABLISHED, event_2);
                        break;
                    case SubscriptionEventType.StreamingSubscriptionLost:
                        _this.emit(SubscriptionManager.STREAMING_SUBSCRIPTION_LOST, event_2);
                        break;
                    case SubscriptionEventType.StreamingSubscriptionHalted:
                        _this.emit(SubscriptionManager.STREAMING_SUBSCRIPTION_HALTED, event_2);
                        break;
                    default:
                        break;
                }
            });
        };
        try {
            for (var _b = __values(record.listeners), _c = _b.next(); !_c.done; _c = _b.next()) {
                var id = _c.value;
                _loop_1(id);
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_10) throw e_10.error; }
        }
    };
    // this method re-throws dependent errors
    SubscriptionManager.prototype.activateSubscription = function (record) {
        if (record.poisoned) {
            return;
        }
        if (this.adapter.getConnectionState() != protocol_adapter.ConnectionState.Connected || record.listeners.size == 0) {
            return;
        }
        if (record.status != SubscriptionStatus.NotSubscribed || record.pendingAction != SubscriptionPendingAction.Nothing) {
            return;
        }
        try {
            this.adapter.subscribe({
                topicFilter: record.topicFilter,
                timeoutInSeconds: this.options.operationTimeoutInSeconds
            });
            io.logDebug(SubscriptionManager.logSubject, "initiated subscribe operation for '".concat(record.topicFilter, "'"));
            record.pendingAction = SubscriptionPendingAction.Subscribing;
        }
        catch (err) {
            io.logError(SubscriptionManager.logSubject, "synchronous failure subscribing to '".concat(record.topicFilter, "': ").concat(err.toString()));
            if (record.type == SubscriptionType.RequestResponse) {
                this.emitEvents(record, SubscriptionEventType.SubscribeFailure);
            }
            else {
                record.poisoned = true;
                this.emitEvents(record, SubscriptionEventType.StreamingSubscriptionHalted);
            }
            throw err;
        }
    };
    SubscriptionManager.prototype.handleRequestSubscribeCompletionEvent = function (record, event) {
        record.pendingAction = SubscriptionPendingAction.Nothing;
        if (!event.err) {
            record.status = SubscriptionStatus.Subscribed;
            this.emitEvents(record, SubscriptionEventType.SubscribeSuccess);
        }
        else {
            this.emitEvents(record, SubscriptionEventType.SubscribeFailure);
        }
    };
    SubscriptionManager.prototype.handleStreamingSubscribeCompletionEvent = function (record, event) {
        record.pendingAction = SubscriptionPendingAction.Nothing;
        if (!event.err) {
            record.status = SubscriptionStatus.Subscribed;
            this.emitEvents(record, SubscriptionEventType.StreamingSubscriptionEstablished);
        }
        else {
            if (event.retryable && !this.closed) {
                this.activateSubscription(record);
            }
            else {
                record.poisoned = true;
                this.emitEvents(record, SubscriptionEventType.StreamingSubscriptionHalted);
            }
        }
    };
    SubscriptionManager.prototype.handleSubscribeCompletionEvent = function (event) {
        io.logDebug(SubscriptionManager.logSubject, " received a protocol adapter subscribe completion event: ".concat(JSON.stringify(event)));
        var record = this.records.get(event.topicFilter);
        if (!record) {
            return;
        }
        if (record.pendingAction != SubscriptionPendingAction.Subscribing) {
            return;
        }
        if (record.type == SubscriptionType.RequestResponse) {
            this.handleRequestSubscribeCompletionEvent(record, event);
        }
        else {
            this.handleStreamingSubscribeCompletionEvent(record, event);
        }
    };
    SubscriptionManager.prototype.handleUnsubscribeCompletionEvent = function (event) {
        var _this = this;
        io.logDebug(SubscriptionManager.logSubject, " received a protocol adapter unsubscribe completion event: ".concat(JSON.stringify(event)));
        var record = this.records.get(event.topicFilter);
        if (!record) {
            return;
        }
        if (record.pendingAction != SubscriptionPendingAction.Unsubscribing) {
            return;
        }
        record.pendingAction = SubscriptionPendingAction.Nothing;
        if (!event.err) {
            record.status = SubscriptionStatus.NotSubscribed;
            var topicFilter_1 = record.topicFilter;
            setImmediate(function () {
                _this.emit(SubscriptionManager.UNSUBSCRIBE_COMPLETE, {
                    topicFilter: topicFilter_1
                });
            });
        }
    };
    SubscriptionManager.prototype.handleSessionLost = function () {
        var e_11, _a, e_12, _b;
        var toRemove = new Array();
        try {
            for (var _c = __values(this.records), _d = _c.next(); !_d.done; _d = _c.next()) {
                var _e = __read(_d.value, 2), _ = _e[0], record = _e[1];
                if (record.status != SubscriptionStatus.Subscribed) {
                    continue;
                }
                record.status = SubscriptionStatus.NotSubscribed;
                if (record.type == SubscriptionType.RequestResponse) {
                    this.emitEvents(record, SubscriptionEventType.SubscriptionEnded);
                    if (record.pendingAction != SubscriptionPendingAction.Unsubscribing) {
                        toRemove.push(record.topicFilter);
                    }
                }
                else {
                    this.emitEvents(record, SubscriptionEventType.StreamingSubscriptionLost);
                }
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_11) throw e_11.error; }
        }
        for (var topicFilter in toRemove) {
            this.records.delete(topicFilter);
        }
        try {
            for (var _f = __values(this.records), _g = _f.next(); !_g.done; _g = _f.next()) {
                var _h = __read(_g.value, 2), _ = _h[0], record = _h[1];
                if (record.type == SubscriptionType.EventStream) {
                    this.activateSubscription(record);
                }
            }
        }
        catch (e_12_1) { e_12 = { error: e_12_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
            }
            finally { if (e_12) throw e_12.error; }
        }
    };
    SubscriptionManager.prototype.activateIdleSubscriptions = function () {
        var e_13, _a;
        try {
            for (var _b = __values(this.records), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), _ = _d[0], record = _d[1];
                this.activateSubscription(record);
            }
        }
        catch (e_13_1) { e_13 = { error: e_13_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_13) throw e_13.error; }
        }
    };
    SubscriptionManager.prototype.handleConnectionStatusEvent = function (event) {
        io.logDebug(SubscriptionManager.logSubject, " received a protocol adapter connection status event: ".concat(JSON.stringify(event)));
        if (event.status != protocol_adapter.ConnectionState.Connected) {
            return;
        }
        if (!event.joinedSession) {
            this.handleSessionLost();
        }
        this.purge();
        this.activateIdleSubscriptions();
    };
    SubscriptionManager.logSubject = "SubscriptionManager";
    SubscriptionManager.SUBSCRIBE_SUCCESS = 'subscribeSuccess';
    SubscriptionManager.SUBSCRIBE_FAILURE = 'subscribeFailure';
    SubscriptionManager.SUBSCRIPTION_ENDED = 'subscriptionEnded';
    SubscriptionManager.STREAMING_SUBSCRIPTION_ESTABLISHED = "streamingSubscriptionEstablished";
    SubscriptionManager.STREAMING_SUBSCRIPTION_LOST = "streamingSubscriptionLost";
    SubscriptionManager.STREAMING_SUBSCRIPTION_HALTED = "streamingSubscriptionHalted";
    SubscriptionManager.SUBSCRIPTION_ORPHANED = "subscriptionOrphaned";
    SubscriptionManager.UNSUBSCRIBE_COMPLETE = "unsubscribeComplete";
    return SubscriptionManager;
}(event_1.BufferedEventEmitter));
exports.SubscriptionManager = SubscriptionManager;
//# sourceMappingURL=subscription_manager.js.map