import json
import httpx

from confluent_kafka import Consumer
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.incident import Incident


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"

AI_RESULTS_TOPIC = "visionv.ai-results"

AI_EVENTS_URL = (
    "http://127.0.0.1:8000/api/internal/ai-results"
)


# --------------------------------------------------
# KAFKA CONSUMER
# --------------------------------------------------

consumer = Consumer({
    "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
    "group.id": "visionv-ai-results-saver",
    "auto.offset.reset": "earliest",
    "enable.auto.commit": False
})


# --------------------------------------------------
# SAVE AI RESULTS TO SQLITE
# --------------------------------------------------

def save_ai_result(ai_result: dict) -> bool:
    db: Session = SessionLocal()

    try:
        incident_id = ai_result.get("incident_id")

        if incident_id is None:
            print("ERROR: AI result has no incident_id.")
            return False

        incident = (
            db.query(Incident)
            .filter(Incident.id == incident_id)
            .first()
        )

        if incident is None:
            print(
                f"ERROR: Incident {incident_id} "
                "was not found in SQLite."
            )
            return False

        incident_type = ai_result.get("incident_type")
        severity = ai_result.get("severity")
        people_count = ai_result.get("people_count")
        resources = ai_result.get("resources")
        summary = ai_result.get("summary")
        confidence = ai_result.get("confidence")

        if incident_type is not None:
            incident.incident_type = incident_type

        if severity is not None:
            incident.severity = severity

        if people_count is not None:
            incident.people_count = people_count

        if resources is not None:
            incident.resources = json.dumps(resources)

        if summary is not None:
            incident.summary = summary

        if confidence is not None:
            incident.confidence = confidence

        db.commit()

        print(
            f"SUCCESS: Incident {incident_id} "
            "updated in SQLite."
        )
        print(f"Category: {incident.incident_type}")
        print(f"Severity: {incident.severity}")
        print(f"Resources: {incident.resources}")

        return True

    except Exception as exc:
        db.rollback()
        print(f"Database update failed: {exc}")
        return False

    finally:
        db.close()


# --------------------------------------------------
# SEND AI RESULTS TO FASTAPI
# --------------------------------------------------

def broadcast_ai_result(ai_result: dict) -> bool:
    try:
        response = httpx.post(
            AI_EVENTS_URL,
            json=ai_result,
            timeout=5.0
        )

        response.raise_for_status()

        print(
            "SUCCESS: AI result sent to FastAPI "
            "for WebSocket broadcasting."
        )

        return True

    except httpx.HTTPError as exc:
        print(f"WebSocket broadcast request failed: {exc}")
        return False


# --------------------------------------------------
# PROCESS ONE KAFKA MESSAGE
# --------------------------------------------------

def process_ai_result(ai_result: dict) -> bool:
    incident_id = ai_result.get("incident_id")

    print("\nProcessing AI result...")
    print(json.dumps(ai_result, indent=2))

    # Save the classification first.
    saved = save_ai_result(ai_result)

    if not saved:
        print(
            f"AI result for incident {incident_id} "
            "could not be saved."
        )
        return False

    # Then request a real-time broadcast.
    broadcasted = broadcast_ai_result(ai_result)

    if not broadcasted:
        print(
            "WARNING: Database was updated, but "
            "the broadcast request failed."
        )
        return False

    return True


# --------------------------------------------------
# START CONSUMER
# --------------------------------------------------

def start_ai_results_consumer():
    consumer.subscribe([AI_RESULTS_TOPIC])

    print("=" * 50)
    print("VisionV AI Results Consumer started.")
    print(f"Listening to: {AI_RESULTS_TOPIC}")
    print("Waiting for AI classification results...")
    print("=" * 50)

    try:
        while True:
            message = consumer.poll(1.0)

            if message is None:
                continue

            if message.error():
                print(f"Kafka error: {message.error()}")
                continue

            try:
                ai_result = json.loads(
                    message.value().decode("utf-8")
                )

                success = process_ai_result(ai_result)

                if success:
                    # Commit this message only after both
                    # database saving and broadcast succeed.
                    consumer.commit(
                        message=message,
                        asynchronous=False
                    )
                    print("Kafka message processed successfully.")

                else:
                    print(
                        "Message was not fully processed. "
                        "It has not been committed."
                    )

            except (ValueError, TypeError) as exc:
                print(f"Invalid AI result message: {exc}")

                # Prevent a permanently malformed message
                # from blocking the consumer indefinitely.
                consumer.commit(
                    message=message,
                    asynchronous=False
                )

    except KeyboardInterrupt:
        print("\nAI Results Consumer stopped.")

    finally:
        consumer.close()
        print("Kafka consumer closed.")


if __name__ == "__main__":
    start_ai_results_consumer()