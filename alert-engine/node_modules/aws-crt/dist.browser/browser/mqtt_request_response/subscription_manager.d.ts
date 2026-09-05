import { BufferedEventEmitter } from "../../common/event";
import * as protocol_adapter from "./protocol_adapter";
/**
 *
 * @packageDocumentation
 * @module mqtt_request_response
 *
 */
export declare enum SubscriptionEventType {
    SubscribeSuccess = 0,
    SubscribeFailure = 1,
    SubscriptionEnded = 2,
    StreamingSubscriptionEstablished = 3,
    StreamingSubscriptionLost = 4,
    StreamingSubscriptionHalted = 5,
    SubscriptionOrphaned = 6,
    UnsubscribeComplete = 7
}
export interface SubscribeSuccessEvent {
    topicFilter: string;
    operationId: number;
}
export type SubscribeSuccessEventListener = (event: SubscribeSuccessEvent) => void;
export interface SubscribeFailureEvent {
    topicFilter: string;
    operationId: number;
}
export type SubscribeFailureEventListener = (event: SubscribeFailureEvent) => void;
export interface SubscriptionEndedEvent {
    topicFilter: string;
    operationId: number;
}
export type SubscriptionEndedEventListener = (event: SubscriptionEndedEvent) => void;
export interface StreamingSubscriptionEstablishedEvent {
    topicFilter: string;
    operationId: number;
}
export type StreamingSubscriptionEstablishedEventListener = (event: StreamingSubscriptionEstablishedEvent) => void;
export interface StreamingSubscriptionLostEvent {
    topicFilter: string;
    operationId: number;
}
export type StreamingSubscriptionLostEventListener = (event: StreamingSubscriptionLostEvent) => void;
export interface StreamingSubscriptionHaltedEvent {
    topicFilter: string;
    operationId: number;
}
export type StreamingSubscriptionHaltedEventListener = (event: StreamingSubscriptionHaltedEvent) => void;
export interface SubscriptionOrphanedEvent {
    topicFilter: string;
}
export type SubscriptionOrphanedEventListener = (event: SubscriptionOrphanedEvent) => void;
export interface UnsubscribeCompleteEvent {
    topicFilter: string;
}
export type UnsubscribeCompleteEventListener = (event: UnsubscribeCompleteEvent) => void;
export declare enum SubscriptionType {
    EventStream = 0,
    RequestResponse = 1
}
export interface AcquireSubscriptionConfig {
    topicFilters: Array<string>;
    operationId: number;
    type: SubscriptionType;
}
export interface ReleaseSubscriptionsConfig {
    topicFilters: Array<string>;
    operationId: number;
}
export declare enum AcquireSubscriptionResult {
    Subscribed = 0,
    Subscribing = 1,
    Blocked = 2,
    NoCapacity = 3,
    Failure = 4
}
export declare function acquireSubscriptionResultToString(result: AcquireSubscriptionResult): string;
export interface SubscriptionManagerConfig {
    maxRequestResponseSubscriptions: number;
    maxStreamingSubscriptions: number;
    operationTimeoutInSeconds: number;
}
export declare class SubscriptionManager extends BufferedEventEmitter {
    private adapter;
    private options;
    private static logSubject;
    private closed;
    private records;
    constructor(adapter: protocol_adapter.ProtocolClientAdapter, options: SubscriptionManagerConfig);
    close(): void;
    acquireSubscription(options: AcquireSubscriptionConfig): AcquireSubscriptionResult;
    releaseSubscription(options: ReleaseSubscriptionsConfig): void;
    purge(): void;
    static SUBSCRIBE_SUCCESS: string;
    static SUBSCRIBE_FAILURE: string;
    static SUBSCRIPTION_ENDED: string;
    static STREAMING_SUBSCRIPTION_ESTABLISHED: string;
    static STREAMING_SUBSCRIPTION_LOST: string;
    static STREAMING_SUBSCRIPTION_HALTED: string;
    static SUBSCRIPTION_ORPHANED: string;
    static UNSUBSCRIBE_COMPLETE: string;
    on(event: 'subscribeSuccess', listener: SubscribeSuccessEventListener): this;
    on(event: 'subscribeFailure', listener: SubscribeFailureEventListener): this;
    on(event: 'subscriptionEnded', listener: SubscriptionEndedEventListener): this;
    on(event: 'streamingSubscriptionEstablished', listener: StreamingSubscriptionEstablishedEventListener): this;
    on(event: 'streamingSubscriptionLost', listener: StreamingSubscriptionLostEventListener): this;
    on(event: 'streamingSubscriptionHalted', listener: StreamingSubscriptionHaltedEventListener): this;
    on(event: 'subscriptionOrphaned', listener: SubscriptionOrphanedEventListener): this;
    on(event: 'unsubscribeComplete', listener: UnsubscribeCompleteEventListener): this;
    private getStats;
    private unsubscribe;
    private unsubscribeAll;
    private removeSubscriptionListener;
    private emitEvents;
    private activateSubscription;
    private handleRequestSubscribeCompletionEvent;
    private handleStreamingSubscribeCompletionEvent;
    private handleSubscribeCompletionEvent;
    private handleUnsubscribeCompletionEvent;
    private handleSessionLost;
    private activateIdleSubscriptions;
    private handleConnectionStatusEvent;
}
