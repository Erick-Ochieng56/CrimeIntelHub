from django.core.management.base import BaseCommand
import redis

class Command(BaseCommand):
    help = 'Test Redis connection'

    def handle(self, *args, **kwargs):
        r = redis.Redis(
            host='redis-10598.c278.us-east-1-4.ec2.redns.redis-cloud.com',
            port=10598,
            decode_responses=True,
            username="ryman",
            password="Demon@56",
        )

        try:
            success = r.set('test_key', 'test_value')
            self.stdout.write(f"Set operation successful: {success}")

            result = r.get('test_key')
            self.stdout.write(f"Retrieved value: {result}")
        except redis.exceptions.AuthenticationError as e:
            self.stderr.write(f"Authentication failed: {e}")
        except Exception as e:
            self.stderr.write(f"An error occurred: {e}")