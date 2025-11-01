const amqp = require("amqplib");
const config = require("../config");
const OrderService = require("../services/orderService");

class MessageBroker {
  static async connect() {
    try {
      const connection = await amqp.connect("amqp://rabbitmq");
      const channel = await connection.createChannel();

      // Declare the order queue
      await channel.assertQueue(config.rabbitMQQueue, { durable: true });

      // Consume messages from the order queue on buy
      channel.consume(config.rabbitMQQueue, async (message) => {
        try {
          const order = JSON.parse(message.content.toString());
          const orderService = new OrderService();

          // Xử lý tạo order
          await orderService.createOrder(order);

          // Gửi phản hồi sang queue "products"
          await channel.assertQueue("products", { durable: true });
          await channel.sendToQueue(
            "products",
            Buffer.from(
              JSON.stringify({
                orderId: order.orderId,
                status: "completed",
                message: "Order processed successfully",
              })
            ),
            { persistent: true }
          );

          channel.ack(message);
        } catch (error) {
          console.error("Error processing order:", error);
          channel.reject(message, false);
        }
      });

      console.log("order-service connected to RabbitMQ and waiting for messages...");
    } catch (error) {
      console.error(" RabbitMQ connection error:", error);
    }
  }
}

module.exports = MessageBroker;
