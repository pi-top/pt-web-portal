from json import dumps as jdumps
from typing import List

from geventwebsocket.exceptions import WebSocketError
from geventwebsocket.websocket import WebSocket
from pitop.common.logger import PTLogger

from ..backend.helpers.modules import get_apt
from .types import EventNames, MessageType

(apt, apt.progress, apt_pkg) = get_apt()


class OSUpdaterFrontendMessageHandler:
    ws_clients: List[WebSocket] = []

    def _send(self, ws, message):
        if ws not in self.ws_clients:
            PTLogger.info(f"New websocket {ws} - adding to list of clients")
            self.ws_clients.append(ws)

        try:
            for ws_client in self.ws_clients:
                ws_client.send(message)
        except WebSocketError:
            PTLogger.info(f"Request failed - removing {ws} from list of clients")
            self.ws_clients.remove(ws)

    def create_emit_update_sources_message(self, ws):
        def emit_update_sources_message(
            message_type: MessageType, status_message: str, percent: float
        ) -> None:
            message = status_message.strip()
            data = {
                "type": EventNames.UPDATE_SOURCES.name,
                "payload": {
                    "status": message_type.name,
                    "percent": percent,
                    "message": message,
                },
            }
            PTLogger.info(f"APT Source: {percent}% '{message}'")

            self._send(ws, jdumps(data))

        return emit_update_sources_message

    def create_emit_os_prepare_upgrade_message(self, ws):
        def emit_os_prepare_upgrade_message(
            message_type: MessageType, status_message: str, percent: float
        ) -> None:
            message = status_message.strip()
            data = {
                "type": EventNames.OS_PREPARE_UPGRADE.name,
                "payload": {
                    "status": message_type.name,
                    "percent": percent,
                    "message": message,
                },
            }
            PTLogger.info(f"Upgrade Prepare: {percent}% '{message}'")

            if not ws:
                return
            self._send(ws, jdumps(data))

        return emit_os_prepare_upgrade_message

    def create_emit_os_upgrade_message(self, ws):
        def emit_os_upgrade_message(
            message_type: MessageType, status_message: str, percent: float
        ) -> None:
            message = status_message.strip()
            data = {
                "type": EventNames.OS_UPGRADE.name,
                "payload": {
                    "status": message_type.name,
                    "percent": percent,
                    "message": message,
                },
            }
            PTLogger.info(f"OS Upgrade: {percent}% '{message}'")

            if not ws:
                return
            self._send(ws, jdumps(data))

        return emit_os_upgrade_message

    def create_emit_os_size_message(self, ws):
        def emit_os_size_message(message_type, size):
            data = {
                "type": EventNames.SIZE.name,
                "payload": {"size": size, "status": message_type.name},
            }
            PTLogger.info(f"OS upgrade size: {size}")

            if not ws:
                return
            self._send(ws, jdumps(data))

        return emit_os_size_message
