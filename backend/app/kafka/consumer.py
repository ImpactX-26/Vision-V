
import json

from confluent_kafka import Consumer, Producer
from app.services.ai_service import mock_ai_classification


KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"


consumer = Consumer({
    "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
    "group.id": "visionv-ai-service",
    "auto.offset.reset": "earliest"
})


producer = Producer({
    "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS
})


def delivery_report(err, msg):
    if err is not None:
        print(f"AI result delivery failed: {err}")
    else:
        print(
            f"AI result published to "
            f"{msg.topic()} [{msg.partition()}]"
        )


def start_consumer():
    consumer.subscribe(["visionv.incidents"])

    print("VisionV AI Consumer started...")
    print("Waiting for incidents...")

    try:
        while True:
            message = consumer.poll(1.0)

            if message is None:
                continue

            if message.error():
                print(f"Kafka error: {message.error()}")
                continue

            try:
                incident = json.loads(
                    message.value().decode("utf-8")
                )

                print("\nNew incident received:")
                print(json.dumps(incident, indent=2))

                # Classify the incident using the mock AI service
                ai_result = mock_ai_classification(incident)

                print("\nAI classification result:")
                print(json.dumps(ai_result, indent=2))

                # Publish the AI result to Kafka
                producer.produce(
                    topic="visionv.ai-results",
                    key=str(ai_result.get("incident_id") or ""),
                    value=json.dumps(ai_result).encode("utf-8"),
                    callback=delivery_report
                )

                producer.flush(timeout=10)

            except (ValueError, TypeError, KeyError) as exc:
                print(f"Could not process incident message: {exc}")

    except KeyboardInterrupt:
        print("\nConsumer stopped.")

    finally:
        consumer.close()
        producer.flush()


if __name__ == "__main__":
    start_consumer()
