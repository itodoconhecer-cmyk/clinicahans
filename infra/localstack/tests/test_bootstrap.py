"""Valida idempotencia e falhas sem Docker, boto3 instalado ou conta AWS."""
import importlib.util
import json
from pathlib import Path
import sys
from types import ModuleType
import unittest
from unittest.mock import MagicMock, patch


class ClientError(Exception):
    def __init__(self, code):
        self.response = {"Error": {"Code": code}}


def load_bootstrap():
    boto = ModuleType("boto3")
    exceptions = ModuleType("botocore.exceptions")
    exceptions.ClientError = ClientError
    with patch.dict(sys.modules, {"boto3": boto, "botocore": ModuleType("botocore"), "botocore.exceptions": exceptions}):
        path = Path(__file__).parents[1] / "ready.d" / "10-clinicahans.py"
        spec = importlib.util.spec_from_file_location("bootstrap_test", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    return module


class BootstrapTest(unittest.TestCase):
    def test_reapply_preserves_resources_and_restores_configuration(self):
        bootstrap = load_bootstrap()
        services = {name: MagicMock() for name in ["sqs", "s3", "dynamodb", "iam", "scheduler"]}
        bootstrap.client = services.__getitem__
        queues = {}

        def get_queue(QueueName):
            if QueueName not in queues:
                raise ClientError("QueueDoesNotExist")
            return {"QueueUrl": queues[QueueName]}

        def create_queue(QueueName, Attributes):
            queues[QueueName] = "http://localhost:4566/000000000000/" + QueueName
            return {"QueueUrl": queues[QueueName]}

        services["sqs"].get_queue_url.side_effect = get_queue
        services["sqs"].create_queue.side_effect = create_queue
        services["sqs"].get_queue_attributes.side_effect = lambda QueueUrl, AttributeNames: {
            "Attributes": {"QueueArn": "arn:aws:sqs:us-east-1:000000000000:" + QueueUrl.rsplit("/", 1)[1]}}
        services["s3"].head_bucket.side_effect = [ClientError("404"), {}]
        services["dynamodb"].describe_table.side_effect = [ClientError("ResourceNotFoundException"), {}]
        services["iam"].get_role.side_effect = [ClientError("NoSuchEntity"), {"Role": {"Arn": "arn:aws:iam::000000000000:role/test"}}]
        services["iam"].create_role.return_value = {"Role": {"Arn": "arn:aws:iam::000000000000:role/test"}}
        services["scheduler"].get_schedule.side_effect = [ClientError("ResourceNotFoundException"), {}]

        bootstrap.provision()
        bootstrap.provision()

        self.assertEqual(4, services["sqs"].create_queue.call_count)
        services["s3"].create_bucket.assert_called_once()
        services["dynamodb"].create_table.assert_called_once()
        services["iam"].create_role.assert_called_once()
        services["scheduler"].create_schedule.assert_called_once()
        services["scheduler"].update_schedule.assert_called_once()
        schedule = services["scheduler"].update_schedule.call_args.kwargs
        self.assertEqual("cron(0 0,12 * * ? *)", schedule["ScheduleExpression"])
        self.assertEqual("America/Sao_Paulo", schedule["ScheduleExpressionTimezone"])
        self.assertEqual({"type": "CHECK_READY_EXAMS", "schemaVersion": 1}, json.loads(schedule["Target"]["Input"]))
        self.assertTrue(schedule["Target"]["Arn"].endswith(":clinicahans-jobs"))
        config = services["s3"].put_public_access_block.call_args.kwargs["PublicAccessBlockConfiguration"]
        self.assertTrue(all(config.values()))
        for call in services["sqs"].set_queue_attributes.call_args_list:
            attrs = call.kwargs["Attributes"]
            if "RedrivePolicy" in attrs:
                policy = json.loads(attrs["RedrivePolicy"])
                self.assertEqual("5", policy["maxReceiveCount"])
                self.assertTrue(policy["deadLetterTargetArn"].endswith("-dlq"))

    def test_access_denied_is_not_treated_as_absent_queue(self):
        bootstrap = load_bootstrap()
        sqs = MagicMock()
        sqs.get_queue_url.side_effect = ClientError("AccessDenied")
        with self.assertRaises(ClientError):
            bootstrap.ensure_queue(sqs, "test", {})
        sqs.create_queue.assert_not_called()


if __name__ == "__main__":
    unittest.main()
