const express = require("express");
const mongoose = require("mongoose");
const Order = require("./models/order");
const amqp = require("amqplib");
const config = require("./config");

class App {
  constructor() {
    this.app = express();
    this.connectDB();
    this.setupOrderConsumer();
  }

  async connectDB() {
    try {
      await mongoose.connect(config.mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("✅ MongoDB connected");
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error.message);
    }
  }

  async disconnectDB() {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }

  async setupOrderConsumer() {
    console.log("🐇 Connecting to RabbitMQ...");

    const connectToRabbitMQ = async (retries = 10) => {
      try {
        const connection = await amqp.connect(config.rabbitMQURI);
        console.log("✅ Connected to RabbitMQ");

        const channel = await connection.createChannel();

        // ✅ Đảm bảo cả hai queue tồn tại
        await channel.assertQueue(config.rabbitMQQueue); // "orders"
        await channel.assertQueue("products"); // Thêm dòng này để tránh lỗi NOT_FOUND

        console.log(`📦 Queue "${config.rabbitMQQueue}" and "products" are ready`);

        // Lắng nghe queue "orders"
        channel.consume(config.rabbitMQQueue, async (data) => {
          console.log("📩 Received new order message");
          const { products, username, orderId } = JSON.parse(data.content);

          try {
            const newOrder = new Order({
              products,
              user: username,
              totalPrice: products.reduce((acc, product) => acc + product.price, 0),
            });

            await newOrder.save();
            channel.ack(data);
            console.log("✅ Order saved and ACK sent to queue");

            // Gửi phản hồi sang queue "products"
            const { user, products: savedProducts, totalPrice } = newOrder.toJSON();

            channel.sendToQueue(
              "products",
              Buffer.from(
                JSON.stringify({
                  orderId,
                  user,
                  products: savedProducts,
                  totalPrice,
                })
              )
            );

            console.log(`📤 Sent message back to "products" queue for orderId ${orderId}`);
          } catch (err) {
            console.error("❌ Error processing order:", err.message);
            channel.nack(data, false, false); // Từ chối message nếu lỗi
          }
        });
      } catch (err) {
        console.error(`❌ Failed to connect to RabbitMQ: ${err.message}`);
        if (retries > 0) {
          console.log(`🔁 Retrying in 5 seconds... (${retries} retries left)`);
          setTimeout(() => connectToRabbitMQ(retries - 1), 5000);
        } else {
          console.error("🚨 Could not connect to RabbitMQ after multiple attempts.");
        }
      }
    };

    connectToRabbitMQ();
  }

  start() {
    this.server = this.app.listen(config.port, () =>
      console.log(`🚀 Order Service started on port ${config.port}`)
    );
  }

  async stop() {
    await mongoose.disconnect();
    this.server.close();
    console.log("Server stopped");
  }
}

module.exports = App;
