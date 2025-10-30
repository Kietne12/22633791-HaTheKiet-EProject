const express = require("express");
const httpProxy = require("http-proxy");
require("dotenv").config(); // 👈 đọc file .env

const proxy = httpProxy.createProxyServer();
const app = express();

// Đọc biến môi trường từ file .env
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL;

// Route requests
app.use("/auth", (req, res) => proxy.web(req, res, { target: AUTH_SERVICE_URL }));
app.use("/products", (req, res) => proxy.web(req, res, { target: PRODUCT_SERVICE_URL }));
app.use("/orders", (req, res) => proxy.web(req, res, { target: ORDER_SERVICE_URL }));

const port = process.env.PORT || 3003;
app.listen(port, () => console.log(`🚀 API Gateway running on port ${port}`));
