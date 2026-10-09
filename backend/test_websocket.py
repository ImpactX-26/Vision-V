import asyncio
import websockets


async def test_websocket():

    uri = "ws://127.0.0.1:8000/ws"

    async with websockets.connect(uri) as websocket:

        print("Connected to VisionV WebSocket")

        message = await websocket.recv()

        print("Received:")
        print(message)

        print("\nWaiting for real-time updates...")

        while True:
            message = await websocket.recv()
            print("\nReal-time update received:")
            print(message)


asyncio.run(test_websocket())

