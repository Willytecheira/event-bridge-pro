import { Kafka, Consumer, EachMessagePayload, logLevel, AssignerProtocol } from 'kafkajs';
import { env } from './config.js';
import { createLogger } from './logger.js';
import { EventPipeline } from './pipeline.js';

const logger = createLogger('consumer');

export class ExternalConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private pipeline: EventPipeline;
  private topic: string;
  private running = false;

  constructor(pipeline: EventPipeline) {
    this.pipeline = pipeline;
    this.topic = env('BRIDGEWISE_TOPIC', 'alerts-reasoning-external');

    const brokers = env('BRIDGEWISE_KAFKA_BROKERS').split(',');
    const username = process.env.BRIDGEWISE_KAFKA_USERNAME;
    const password = process.env.BRIDGEWISE_KAFKA_PASSWORD;
    const mechanism = (process.env.BRIDGEWISE_KAFKA_MECHANISM || 'plain') as any;

    const sasl = username && password ? { mechanism, username, password } : undefined;

    this.kafka = new Kafka({
      clientId: 'bridgewise-bridge',
      brokers,
      ssl: !!sasl, // Enable SSL when using SASL
      sasl,
      retry: {
        initialRetryTime: 1000,
        retries: 20,
        maxRetryTime: 30000,
      },
      logLevel: logLevel.WARN,
    });

    // Use 'range' assigner to match Java/librdkafka consumers in the same group
    const rangeAssigner = ({ cluster, memberAssignment }: any) => ({
      name: 'range',
      version: 0,
      async assign({ members, topics }: any) {
        const assignment: Record<string, any> = {};
        for (const member of members) {
          assignment[member.memberId] = {};
        }

        for (const topic of topics) {
          const partitionMetadata = cluster.findTopicPartitionMetadata(topic);
          const numPartitions = partitionMetadata.length;
          const numMembers = members.length;
          const range = Math.ceil(numPartitions / numMembers);

          members.forEach((member: any, i: number) => {
            const start = range * i;
            const end = Math.min(start + range, numPartitions);
            assignment[member.memberId][topic] = [];
            for (let partition = start; partition < end; partition++) {
              assignment[member.memberId][topic].push(partition);
            }
          });
        }

        return Object.keys(assignment).map((memberId) => ({
          memberId,
          memberAssignment: AssignerProtocol.MemberAssignment.encode({
            version: 0,
            assignment: assignment[memberId],
            userData: Buffer.alloc(0),
          }),
        }));
      },
      protocol({ topics }: any) {
        return {
          name: 'range',
          metadata: AssignerProtocol.MemberMetadata.encode({
            version: 0,
            topics,
            userData: Buffer.alloc(0),
          }),
        };
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: env('BRIDGEWISE_CONSUMER_GROUP', 'bridgewise-bridge-consumer'),
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      retry: { retries: 10 },
      partitionAssigners: [rangeAssigner],
    });
  }

  async start() {
    // Event listeners for connection monitoring
    const { CONNECT, DISCONNECT, CRASH, REQUEST_TIMEOUT } = this.consumer.events;

    this.consumer.on(CONNECT, () => {
      logger.info('Consumer connected to external Kafka');
    });

    this.consumer.on(DISCONNECT, () => {
      logger.warn('Consumer disconnected from external Kafka');
    });

    this.consumer.on(CRASH, ({ payload }) => {
      logger.error({ error: payload.error }, 'Consumer crashed');
      if (!payload.restart) {
        logger.error('Consumer will NOT restart automatically. Exiting...');
        process.exit(1);
      }
    });

    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

    this.running = true;

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { message, partition, topic } = payload;

        if (!message.value) {
          logger.warn({ partition, offset: message.offset }, 'Received null message');
          return;
        }

        try {
          await this.pipeline.process(message.value as Buffer);
        } catch (err: any) {
          logger.error({
            err,
            partition,
            offset: message.offset,
            topic,
          }, 'Unhandled error in pipeline');
          // Don't throw - we don't want to crash the consumer
        }
      },
    });

    logger.info({ topic: this.topic }, 'Consumer started and consuming messages');
  }

  async stop() {
    if (!this.running) return;
    this.running = false;
    await this.consumer.disconnect();
    logger.info('Consumer stopped');
  }
}
