const express = require("express");
const swaggerUi = require("swagger-ui-express");
const routes = require("./routes");
const companyController = require("./controllers/company.controller");
const openApiSpec = require("./docs/openapi.json");

const app = express();

app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.get("/openapi.json", (req, res) => res.json(openApiSpec));

app.use(routes);
app.use(companyController.errorHandler);

module.exports = app;
