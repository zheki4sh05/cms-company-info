const { Kafka } = require("kafkajs");

function getRequiredEnv(name) {
  const value = process.env[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required config: ${name}`);
  }
  return value.trim();
}

function getKafkaConfig() {
  const topic = getRequiredEnv("KAFKA_AUTH_TOPIC");
  const clientId = getRequiredEnv("KAFKA_CLIENT_ID");
  const brokers = getRequiredEnv("KAFKA_BROKERS")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (brokers.length === 0) {
    throw new Error("KAFKA_BROKERS must contain at least one broker");
  }

  return { topic, clientId, brokers };
}

let producerInstancePromise;

async function getProducer() {
  if (!producerInstancePromise) {
    producerInstancePromise = (async () => {
      const { clientId, brokers } = getKafkaConfig();
      const kafka = new Kafka({ clientId, brokers });
      const producer = kafka.producer();
      await producer.connect();
      return producer;
    })().catch((error) => {
      producerInstancePromise = null;
      throw error;
    });
  }

  return producerInstancePromise;
}

async function sendAddUserCompanyEvent({ userId, companyId }) {
  const { topic } = getKafkaConfig();
  const producer = await getProducer();
  const payload = {
    type: "ADD_USER_COMPANY",
    userId: String(userId),
    companyId: String(companyId),
  };

  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }],
  });
}

module.exports = {
  sendAddUserCompanyEvent,
};
