import mqtt, { MqttClient } from 'mqtt';
import { mqtt5, iot } from 'aws-iot-device-sdk-v2';
import dotenv from 'dotenv';

dotenv.config();

export interface TelemetryMessageHandler {
  (topic: string, payload: Buffer): void;
}

export class MqttConnectionManager {
  private localClient: MqttClient | null = null;
  private awsClient: mqtt5.Mqtt5Client | null = null;
  private isAws = false;

  public async connect(onMessage: TelemetryMessageHandler): Promise<void> {
    const endpoint = process.env.AWS_IOT_ENDPOINT;
    const certPath = process.env.AWS_IOT_CERT_PATH;
    const keyPath = process.env.AWS_IOT_KEY_PATH;

    if (endpoint && certPath && keyPath) {
      console.log(`[MQTT] Connecting to AWS IoT Core at ${endpoint}...`);
      this.isAws = true;
      const configBuilder = iot.AwsIotMqtt5ClientConfigBuilder.newDirectMqttBuilderWithMtlsFromPath(
        endpoint,
        certPath,
        keyPath
      );
      this.awsClient = new mqtt5.Mqtt5Client(configBuilder.build());

      this.awsClient.on('messageReceived', (eventData: mqtt5.MessageReceivedEvent) => {
        if (eventData.message.topicName && eventData.message.payload) {
          onMessage(eventData.message.topicName, Buffer.from(eventData.message.payload as ArrayBuffer));
        }
      });

      await this.awsClient.start();
      console.log('[MQTT] Connected to AWS IoT Core.');
    } else {
      const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
      console.log(`[MQTT] Connecting to standard MQTT broker at ${brokerUrl}...`);
      this.localClient = mqtt.connect(brokerUrl);

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

  public subscribe(topic: string): void {
    if (this.localClient) {
      this.localClient.subscribe(topic, (err) => {
        if (err) {
          console.error(`[MQTT] Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`[MQTT] Subscribed to topic: ${topic}`);
        }
      });
    } else if (this.awsClient) {
      this.awsClient.subscribe({
        subscriptions: [{ qos: mqtt5.QoS.AtLeastOnce, topicFilter: topic }],
      });
      console.log(`[MQTT] Subscribed AWS IoT to topic: ${topic}`);
    }
  }

  public publish(topic: string, message: string): void {
    if (this.localClient) {
      this.localClient.publish(topic, message);
    } else if (this.awsClient) {
      this.awsClient.publish({
        topicName: topic,
        qos: mqtt5.QoS.AtLeastOnce,
        payload: Buffer.from(message),
      });
    }
  }

  public async disconnect(): Promise<void> {
    if (this.localClient) {
      this.localClient.end();
    }
    if (this.awsClient) {
      await this.awsClient.stop();
    }
  }
}

export const mqttManager = new MqttConnectionManager();
