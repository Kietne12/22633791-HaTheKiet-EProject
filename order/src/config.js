require('dotenv').config();

module.exports = {
  mongoURI: process.env.MONGODB_ORDER_URI || 'mongodb://mongo-service:27017/orderdb',
  rabbitMQURI: process.env.RABBITMQ_URL || 'amqp://rabbitmq',
  rabbitMQQueue: 'orders',
  port: process.env.PORT || 3002,
};
