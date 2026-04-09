const { Kafka } = require("kafkajs");
const { handleCompanyCreatedEvent } = require("../services/company-events.service");

function getRequiredEnv(name) {
  const value = process.env[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required config: ${name}`);
  }
  return value.trim();
}

function getKafkaConfig() {
  const topic = getRequiredEnv("KAFKA_COMPANY_TOPIC");
  const groupId = getRequiredEnv("KAFKA_GROUP_ID");
  const clientId = getRequiredEnv("KAFKA_CLIENT_ID");
  const brokers = getRequiredEnv("KAFKA_BROKERS")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (brokers.length === 0) {
    throw new Error("KAFKA_BROKERS must contain at least one broker");
  }

  return { topic, groupId, clientId, brokers };
}

function parseMessage(rawValue) {
  if (!rawValue) return null;
  try {
    return JSON.parse(rawValue.toString("utf8"));
  } catch {
    return null;
  }
}

async function startCompanyConsumer() {
  const { topic, groupId, clientId, brokers } = getKafkaConfig();
  const kafka = new Kafka({ clientId, brokers });
  const consumer = kafka.consumer({ groupId });

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const payload = parseMessage(message.value);
      if (!payload) {
        console.warn("Kafka company event skipped: invalid JSON");
        return;
      }
      if (payload.event !== "CREATED") {
        return;
      }

      try {
        const result = await handleCompanyCreatedEvent(payload);
        if (result?.skipped) {
          console.error(
            `Kafka company CREATED skipped (${result.reason}): company=${result.companyId}, employee=${result.employeeId}`
          );
          return;
        }
        console.log(
          `Kafka company CREATED processed: company=${result.companyId}, employee=${result.employeeId}`
        );
      } catch (error) {
        console.error("Kafka company CREATED failed:", error.message);
      }
    },
  });

  return consumer;
}

module.exports = { startCompanyConsumer };
