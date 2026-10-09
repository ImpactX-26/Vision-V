from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.manager import manager


router = APIRouter(
    tags=["WebSocket"]
)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):

    await manager.connect(websocket)

    try:
        await websocket.send_json({
            "type": "connection",
            "message": "Connected to VisionV real-time updates"
        })

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(websocket)
