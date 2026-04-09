const { loadEnv } = require("./config/env");
loadEnv();

const app = require("./app");
const { startCompanyConsumer } = require("./kafka/company.consumer");

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

startCompanyConsumer()
  .then(() => {
    console.log("Kafka company consumer started");
  })
  .catch((error) => {
    console.error("Kafka company consumer failed to start:", error.message);
  });
