/**
 *
 * @packageDocumentation
 * @module mqtt_request_response
 *
 */
import { ICrtError } from "../error";
import * as mqtt311 from "../mqtt";
import * as mqtt5 from "../mqtt5";
import * as mqtt_request_response from "../../common/mqtt_request_response";
import { BufferedEventEmitter } from "../../common/event";
export interface PublishOptions {
    topic: string;
    payload: mqtt_request_response.RequestPayload;
    timeoutInSeconds: number;
    completionData: any;
}
export interface PublishCompletionEvent {
    completionData: any;
    err?: ICrtError;
}
export type PublishCompletionEventListener = (event: PublishCompletionEvent) => void;
export interface SubscribeOptions {
    topicFilter: string;
    timeoutInSeconds: number;
}
export interface SubscribeCompletionEvent {
    topicFilter: string;
    err?: ICrtError;
    retryable?: boolean;
}
export type SubscribeCompletionEventListener = (event: SubscribeCompletionEvent) => void;
export interface UnsubscribeOptions {
    topicFilter: string;
    timeoutInSeconds: number;
}
export interface UnsubscribeCompletionEvent {
    topicFilter: string;
    err?: ICrtError;
    retryable?: boolean;
}
export type UnsubscribeCompletionEventListener = (event: UnsubscribeCompletionEvent) => void;
export declare enum ConnectionState {
    Connected = 0,
    Disconnected = 1
}
export interface ConnectionStatusEvent {
    status: ConnectionState;
    joinedSession?: boolean;
}
export type ConnectionStatusEventListener = (event: ConnectionStatusEvent) => void;
export interface IncomingPublishEvent {
    topic: string;
    payload: ArrayBuffer;
}
export type IncomingPublishEventListener = (event: IncomingPublishEvent) => void;
export declare class ProtocolClientAdapter extends BufferedEventEmitter {
    private closed;
    private client5?;
    private client311?;
    private connectionState;
    private connectionSuccessListener5;
    private disconnectionListener5;
    private incomingPublishListener5;
    private connectionSuccessListener311;
    private disconnectionListener311;
    private incomingPublishListener311;
    private constructor();
    static newFrom5(client: mqtt5.Mqtt5Client): ProtocolClientAdapter;
    static newFrom311(client: mqtt311.MqttClientConnection): ProtocolClientAdapter;
    close(): void;
    publish(publishOptions: PublishOptions): void;
    subscribe(subscribeOptions: SubscribeOptions): void;
    unsubscribe(unsubscribeOptions: UnsubscribeOptions): void;
    getConnectionState(): ConnectionState;
    static PUBLISH_COMPLETION: string;
    static SUBSCRIBE_COMPLETION: string;
    static UNSUBSCRIBE_COMPLETION: string;
    static CONNECTION_STATUS: string;
    static INCOMING_PUBLISH: string;
    on(event: 'publishCompletion', listener: PublishCompletionEventListener): this;
    on(event: 'subscribeCompletion', listener: SubscribeCompletionEventListener): this;
    on(event: 'unsubscribeCompletion', listener: UnsubscribeCompletionEventListener): this;
    on(event: 'connectionStatus', listener: ConnectionStatusEventListener): this;
    on(event: 'incomingPublish', listener: IncomingPublishEventListener): this;
    private static FAILING_PUBACK_REASON_CODE;
    private static FAILING_SUBACK_REASON_CODE;
    private static FAILING_UNSUBACK_REASON_CODE;
    private static ILLEGAL_ADAPTER_STATE;
    private static OPERATION_TIMEOUT;
    private static ADAPTER_CLOSED;
    private static isUnsubackReasonCodeRetryable;
    private static isSubackReasonCodeRetryable;
}
