require("dotenv").config();

module.exports = {
  mongoURI: process.env.MONGODB_PRODUCT_URI || 'mongodb://mongo-service:27017/productdb',
  rabbitMQURI: process.env.RABBITMQ_URL || 'amqp://rabbitmq',
  port: process.env.PORT || 3001,
  exchangeName: "products",
  queueName: "products_queue",
};
