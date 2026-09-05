"use strict";
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionStatusEventType = void 0;
/**
 * The type of change to the state of a streaming operation subscription
 */
var SubscriptionStatusEventType;
(function (SubscriptionStatusEventType) {
    /**
     * The streaming operation is successfully subscribed to its topic (filter)
     */
    SubscriptionStatusEventType[SubscriptionStatusEventType["SubscriptionEstablished"] = 0] = "SubscriptionEstablished";
    /**
     * The streaming operation has temporarily lost its subscription to its topic (filter)
     */
    SubscriptionStatusEventType[SubscriptionStatusEventType["SubscriptionLost"] = 1] = "SubscriptionLost";
    /**
     * The streaming operation has entered a terminal state where it has given up trying to subscribe
     * to its topic (filter).  This is always due to user error (bad topic filter or IoT Core permission policy).
     */
    SubscriptionStatusEventType[SubscriptionStatusEventType["SubscriptionHalted"] = 2] = "SubscriptionHalted";
})(SubscriptionStatusEventType = exports.SubscriptionStatusEventType || (exports.SubscriptionStatusEventType = {}));
//# sourceMappingURL=mqtt_request_response.js.map