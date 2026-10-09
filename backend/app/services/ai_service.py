
from datetime import datetime, timezone


def get_value(report, key, default=None):
    """Read a field from either a dictionary or an object."""
    if isinstance(report, dict):
        return report.get(key, default)

    return getattr(report, key, default)


def mock_ai_classification(report):
    """Return a rule-based demonstration classification."""

    description = str(
        get_value(report, "description")
        or get_value(report, "text")
        or ""
    ).lower()

    category = str(
        get_value(report, "category")
        or get_value(report, "incident_type")
        or "Other"
    ).lower()

    incident_id = get_value(report, "incident_id")

    if incident_id is None:
        incident_id = get_value(report, "id")

    lat = get_value(report, "lat")
    lng = get_value(report, "lng")

    if "flood" in description or "flood" in category:
        incident_type = "Flood"
        severity = "P1"
        resources = ["Rescue Team", "Boat", "Medical Team"]
        summary = "Possible flooding; assess rescue needs."

    elif "fire" in description or "fire" in category:
        incident_type = "Fire"
        severity = "P1"
        resources = ["Fire Team", "Medical Team"]
        summary = "Possible fire; assess immediate danger."

    elif any(
        word in description
        for word in (
            "medical",
            "injured",
            "unconscious",
            "ambulance"
        )
    ) or "medical" in category:
        incident_type = "Medical"
        severity = "P1"
        resources = ["Medical Team", "Ambulance"]
        summary = (
            "Possible medical emergency; assess urgent care needs."
        )

    else:
        incident_type = (
            get_value(report, "category")
            or get_value(report, "incident_type")
            or "Other"
        )
        severity = "Unassessed"
        resources = ["Response Team"]
        summary = "Incident requires further assessment."

    return {
        "incident_id": incident_id,
        "incident_type": incident_type,
        "lat": lat,
        "lng": lng,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "severity": severity,
        "people_count": None,
        "resources": resources,
        "summary": summary,
        "confidence": None,
        "classification_method": "mock_rules",
        "requires_human_review": True
    }
