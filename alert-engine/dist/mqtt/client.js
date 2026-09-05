"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mqttManager = exports.MqttConnectionManager = void 0;
const mqtt_1 = __importDefault(require("mqtt"));
const aws_iot_device_sdk_v2_1 = require("aws-iot-device-sdk-v2");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class MqttConnectionManager {
    localClient = null;
    awsClient = null;
    isAws = false;
    async connect(onMessage) {
        const endpoint = process.env.AWS_IOT_ENDPOINT;
        const certPath = process.env.AWS_IOT_CERT_PATH;
        const keyPath = process.env.AWS_IOT_KEY_PATH;
        if (endpoint && certPath && keyPath) {
            console.log(`[MQTT] Connecting to AWS IoT Core at ${endpoint}...`);
            this.isAws = true;
            const configBuilder = aws_iot_device_sdk_v2_1.iot.AwsIotMqtt5ClientConfigBuilder.newDirectMqttBuilderWithMtlsFromPath(endpoint, certPath, keyPath);
            this.awsClient = new aws_iot_device_sdk_v2_1.mqtt5.Mqtt5Client(configBuilder.build());
            this.awsClient.on('messageReceived', (eventData) => {
                if (eventData.message.topicName && eventData.message.payload) {
                    onMessage(eventData.message.topicName, Buffer.from(eventData.message.payload));
                }
            });
            await this.awsClient.start();
            console.log('[MQTT] Connected to AWS IoT Core.');
        }
        else {
            const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
            console.log(`[MQTT] Connecting to standard MQTT broker at ${brokerUrl}...`);
            this.localClient = mqtt_1.default.connect(brokerUrl);
            this.localClient.on('connect', () => {
                console.log(`[MQTT] Connected to standard broker: ${brokerUrl}`);
                this.subscribe('mine/+/vehicle/+/telemetry');
                this.subscribe('mine/+/vehicle/+/sos');
                this.subscribe('mine/+/config/#');
            });
            this.localClient.on('message', (topic, payload) => {
                onMessage(topic, payload);
            });
            this.localClient.on('error', (err) => {
                console.error('[MQTT] Connection error:', err.message);
            });
        }
    }
    subscribe(topic) {
        if (this.localClient) {
            this.localClient.subscribe(topic, (err) => {
                if (err) {
                    console.error(`[MQTT] Failed to subscribe to ${topic}:`, err);
                }
                else {
                    console.log(`[MQTT] Subscribed to topic: ${topic}`);
                }
            });
        }
        else if (this.awsClient) {
            this.awsClient.subscribe({
                subscriptions: [{ qos: aws_iot_device_sdk_v2_1.mqtt5.QoS.AtLeastOnce, topicFilter: topic }],
            });
            console.log(`[MQTT] Subscribed AWS IoT to topic: ${topic}`);
        }
    }
    publish(topic, message) {
        if (this.localClient) {
            this.localClient.publish(topic, message);
        }
        else if (this.awsClient) {
            this.awsClient.publish({
                topicName: topic,
                qos: aws_iot_device_sdk_v2_1.mqtt5.QoS.AtLeastOnce,
                payload: Buffer.from(message),
            });
        }
    }
    async disconnect() {
        if (this.localClient) {
            this.localClient.end();
        }
        if (this.awsClient) {
            await this.awsClient.stop();
        }
    }
}
exports.MqttConnectionManager = MqttConnectionManager;
exports.mqttManager = new MqttConnectionManager();
