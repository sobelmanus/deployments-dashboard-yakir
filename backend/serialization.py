from models import DeploymentOut


def serialize_deployment(doc: dict) -> DeploymentOut:
    out = {k: v for k, v in doc.items() if k != "_id"}
    return DeploymentOut.model_validate(out)
