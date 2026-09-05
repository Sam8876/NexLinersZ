"use strict";
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestResponseClientState = exports.StreamingOperationState = void 0;
/**
 * @packageDocumentation
 * @module mqtt_request_response
 */
var StreamingOperationState;
(function (StreamingOperationState) {
    StreamingOperationState[StreamingOperationState["None"] = 0] = "None";
    StreamingOperationState[StreamingOperationState["Open"] = 1] = "Open";
    StreamingOperationState[StreamingOperationState["Closed"] = 2] = "Closed";
})(StreamingOperationState = exports.StreamingOperationState || (exports.StreamingOperationState = {}));
var RequestResponseClientState;
(function (RequestResponseClientState) {
    RequestResponseClientState[RequestResponseClientState["Ready"] = 0] = "Ready";
    RequestResponseClientState[RequestResponseClientState["Closed"] = 1] = "Closed";
})(RequestResponseClientState = exports.RequestResponseClientState || (exports.RequestResponseClientState = {}));
//# sourceMappingURL=mqtt_request_response_internal.js.map