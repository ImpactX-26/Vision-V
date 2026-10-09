from confluent_kafka import Producer
import json


KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"


producer = Producer({
    "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS
})


def delivery_report(err, msg):
    if err is not None:
        print(f"Kafka message delivery failed: {err}")
    else:
        print(
            f"Kafka message delivered to "
            f"{msg.topic()} [{msg.partition()}]"
        )


def publish_incident(message: dict):

    producer.produce(
        topic="visionv.incidents",
        value=json.dumps(message).encode("utf-8"),
        callback=delivery_report
    )

    producer.flush()