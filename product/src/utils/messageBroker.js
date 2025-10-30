const amqp = require("amqplib");
const config = require("../config");

class MessageBroker {
  constructor() {
    this.channel = null;
    this.connection = null;
  }

  async connect(retries = 10, delay = 5000) {
    console.log("🐇 Connecting to RabbitMQ...");

    for (let i = 0; i < retries; i++) {
      try {
        // Sử dụng URL từ file config (trong Docker sẽ là amqp://rabbitmq)
        this.connection = await amqp.connect(config.rabbitMQURI);
        this.channel = await this.connection.createChannel();
        await this.channel.assertQueue(config.queueName || "products");

        console.log(`✅ Connected to RabbitMQ at ${config.rabbitMQURI}`);
        console.log(`📦 Queue "${config.queueName || "products"}" is ready`);
        return;
      } catch (err) {
        console.error(`❌ Failed to connect to RabbitMQ: ${err.message}`);
        console.log(`🔁 Retrying in ${delay / 1000}s... (${retries - i - 1} retries left)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.error("❌ Could not connect to RabbitMQ after several attempts.");
  }

  async publishMessage(queue, message) {
    if (!this.channel) {
      console.error("⚠️ No RabbitMQ channel available. Message not sent.");
      return;
    }

    try {
      await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
      console.log(`📤 Sent message to queue "${queue}":`, message);
    } catch (err) {
      console.error("❌ Error publishing message:", err.message);
    }
  }

  async consumeMessage(queue, callback) {
    if (!this.channel) {
      console.error("⚠️ No RabbitMQ channel available for consuming.");
      return;
    }

    try {
      await this.channel.consume(queue, (message) => {
        if (message !== null) {
          const content = JSON.parse(message.content.toString());
          callback(content);
          this.channel.ack(message);
          console.log(`📥 Consumed message from "${queue}":`, content);
        }
      });
    } catch (err) {
      console.error("❌ Error consuming message:", err.message);
    }
  }
}

module.exports = new MessageBroker();
