import React, { useCallback, useState, useRef, useEffect } from "react";

import UpgradePage from "./UpgradePage";

import useSocket from "../../hooks/useSocket";
import getAvailableSpace from "../../services/getAvailableSpace";
import wsBaseUrl from "../../services/wsBaseUrl";
import restartWebPortalService from "../../services/restartWebPortalService";
import serverStatus from "../../services/serverStatus"
import getMajorOsUpdates from "../../services/getMajorOsUpdates"

export enum OSUpdaterMessageType {
  UpdateSources = "UPDATE_SOURCES",
  PrepareUpgrade = "OS_PREPARE_UPGRADE",
  Upgrade = "OS_UPGRADE",
  Size = "SIZE",
  State = "STATE",
}

export enum UpdateMessageStatus {
  Start = "START",
  Finish = "FINISH",
  Error = "ERROR",
  Status = "STATUS",
}

export enum UpdateState {
  None = "NONE",
  Connect = "CONNECT",
  Reattaching = "REATTACHING",
  Error = "ERROR",
  WaitingForServer = "WAITING_FOR_SERVER",
  UpdatingSources = "UPDATING_SOURCES",
  PreparingWebPortal = "PREPARING_WEBPORTAL",
  PreparingSystemUpgrade = "PREPARING_SYSTEM_UPGRADE",
  UpgradingWebPortal = "UPGRADING_WEB_PORTAL",
  WaitingForUserInput = "WAITING_FOR_USER_INPUT",
  UpgradingSystem = "UPGRADING_SYSTEM",
  Finished = "FINISHED",
}

export enum SocketMessage {
  PREPARE_SYSTEM_UPGRADE = "prepare",
  PREPARE_WEB_PORTAL_UPGRADE = "prepare_web_portal",
  UPDATE_SOURCES = "update_sources",
  START_UPGRADE = "start",
  USE_DEFAULT_UPDATER = "default-updater-backend",
  USE_LEGACY_UPDATER = "legacy-updater-backend",
  GET_UPGRADE_SIZE = "size",
  GET_STATE = "state",
}

export enum ErrorType {
  None,
  GenericError,
  NoSpaceAvailable,
  UpdaterAlreadyRunning,
}

export type UpgradeMessagePayload = {
  status: UpdateMessageStatus;
  percent: number;
  message: string;
};

export type SizeMessagePayload = {
  size: {
    downloadSize: number;
    requiredSpace: number;
  };
  status: UpdateMessageStatus;
};

export type StateMessagePayload = {
  clients: number;
  busy: boolean;
  status: UpdateMessageStatus;
};

export type UpgradeMessage = {
  type: OSUpdaterMessageType.PrepareUpgrade | OSUpdaterMessageType.Upgrade | OSUpdaterMessageType.UpdateSources;
  payload: UpgradeMessagePayload;
};

export type SizeMessage = {
  type: OSUpdaterMessageType.Size;
  payload: SizeMessagePayload;
};

export type StateMessage = {
  type: OSUpdaterMessageType.State;
  payload: StateMessagePayload;
};

export type OSUpdaterMessage = UpgradeMessage | SizeMessage | StateMessage;

export type Props = {
  goToNextPage?: () => void;
  goToPreviousPage?: () => void;
  isCompleted?: boolean;
};

export default ({ goToNextPage, goToPreviousPage, isCompleted }: Props) => {
  const [message, setMessage] = useState<OSUpdaterMessage>();
  const [isOpen, setIsOpen] = useState(false);
  document.title = "pi-topOS System Update"

  const socket = useSocket(`${wsBaseUrl}/os-upgrade`, );
  socket.onmessage = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      setMessage(data);
    } catch (_) {}
  };
  socket.onopen = () => {
    setIsOpen(true);
  }

  const [checkingWebPortal, setCheckingWebPortal] = useState(window.location.search !== "?all");
  const [updateSize, setUpdateSize] = useState({downloadSize: 0, requiredSpace: 0});
  const [error, setError] = useState<ErrorType>(ErrorType.None);
  const [availableSpace, setAvailableSpace] = useState(0);
  const [requireBurn, setRequireBurn] = useState(false);
  const [shouldBurn, setShouldBurn] = useState(false);
  const [state, setState] = useState<UpdateState>(UpdateState.None)

  const previousStateRef = useRef<UpdateState>();
  const checkingWebPortalRef = useRef<boolean>();

  useEffect(() => {
    previousStateRef.current = state;
    checkingWebPortalRef.current = checkingWebPortal;
  });

  useEffect(() => {
    if (isOpen) {
      socket.send(SocketMessage.USE_DEFAULT_UPDATER);
      if (checkingWebPortalRef.current) {
        setState(UpdateState.Connect);
      } else {
        setState(UpdateState.UpdatingSources);
      }
    }
  }, [isOpen, socket]);

  useEffect(() => {
    if (!checkingWebPortal) {
      getMajorOsUpdates()
          .then((response) => {
            setShouldBurn(response.shouldBurn);
            setRequireBurn(response.requireBurn);
          })
          .catch(() => {
            setShouldBurn(false);
            setRequireBurn(false);
          })
    }
  }, [checkingWebPortal]);

  useEffect(() => {
    getAvailableSpace()
      .then((setAvailableSpace))
      .catch(() => setError(ErrorType.GenericError));
  }, []);

  useEffect(() => {
    error !== ErrorType.None && setState(UpdateState.Error);
  }, [error]);

  useEffect(() => {
    if (!isOpen || previousStateRef.current === UpdateState.Reattaching) {
      return ;
    }

    switch (state) {
      case UpdateState.Connect:
        socket.send(SocketMessage.GET_STATE);
        break;
      case UpdateState.UpdatingSources:
        socket.send(SocketMessage.UPDATE_SOURCES);
        break;
      case UpdateState.PreparingWebPortal:
        socket.send(SocketMessage.PREPARE_WEB_PORTAL_UPGRADE);
        break;
      case UpdateState.PreparingSystemUpgrade:
        socket.send(SocketMessage.PREPARE_SYSTEM_UPGRADE);
        break;
      case UpdateState.UpgradingWebPortal:
      case UpdateState.UpgradingSystem:
        socket.send(SocketMessage.START_UPGRADE);
        break;
    }
  }, [isOpen, socket, state]);

  const doRetry = useCallback(
    (defaultBackend: boolean) => {
      socket.send(defaultBackend ? SocketMessage.USE_DEFAULT_UPDATER : SocketMessage.USE_LEGACY_UPDATER);
      setError(ErrorType.None);
      setUpdateSize({downloadSize: 0, requiredSpace: 0});
      setCheckingWebPortal(true);
      setState(UpdateState.UpdatingSources);
    },
    [],
  )

  useEffect(() => {
    if (availableSpace < updateSize.requiredSpace + updateSize.downloadSize) {
      setError(ErrorType.NoSpaceAvailable);
    }
  }, [updateSize, availableSpace, setError]);

  useEffect(() => {
    socket.onclose = () => {
      state !== UpdateState.Finished && setError(ErrorType.GenericError);
      setIsOpen(false);
    };
  }, [socket, state]);

  useEffect(() => {
    if (!message) {
      return;
    }

    if (
      (message.type === OSUpdaterMessageType.PrepareUpgrade ||
        message.type === OSUpdaterMessageType.UpdateSources ||
        message.type === OSUpdaterMessageType.Upgrade ||
        message.type === OSUpdaterMessageType.Size) &&
      message.payload.status === UpdateMessageStatus.Error
    ) {
      setError(ErrorType.GenericError);
    }

    if (
      (message.type === OSUpdaterMessageType.PrepareUpgrade || message.type === OSUpdaterMessageType.Upgrade)
      && message.payload?.percent
    ) {
        document.title = "[" + message.payload.percent + "%] pi-topOS System Update";
    }

    if (message.type === OSUpdaterMessageType.State) {

      if (message.payload.clients >= 1) {
        setError(ErrorType.UpdaterAlreadyRunning);
        return ;
      }
      setState(message.payload.busy ? UpdateState.Reattaching : UpdateState.UpdatingSources);
    }

    if (
      state === UpdateState.Reattaching &&
      (message.type === OSUpdaterMessageType.PrepareUpgrade ||
        message.type === OSUpdaterMessageType.UpdateSources ||
        message.type === OSUpdaterMessageType.Upgrade) &&
      message.payload.status === UpdateMessageStatus.Status
    ) {
      // Infer current state based on the type of message received
      switch (message.type) {
        case OSUpdaterMessageType.PrepareUpgrade:
          setState(UpdateState.PreparingWebPortal);
          break;
        case OSUpdaterMessageType.UpdateSources:
          setState(UpdateState.UpdatingSources);
          break;
        case OSUpdaterMessageType.Upgrade:
          setState(UpdateState.UpgradingWebPortal);
          break;
      }
    }

    if (
      message.type === OSUpdaterMessageType.PrepareUpgrade &&
      message.payload.status === UpdateMessageStatus.Finish
    ) {
      socket.send(SocketMessage.GET_UPGRADE_SIZE);
    }

    if (
      message.type === OSUpdaterMessageType.UpdateSources &&
      message.payload.status === UpdateMessageStatus.Finish
    ) {
      setState(checkingWebPortal ? UpdateState.PreparingWebPortal : UpdateState.PreparingSystemUpgrade);
    }

    if (
      message.type === OSUpdaterMessageType.Upgrade &&
      message.payload.status === UpdateMessageStatus.Finish
    ) {
      if (checkingWebPortal) {
        setState(UpdateState.WaitingForServer);
        restartWebPortalService()
          .catch(() => setError(ErrorType.None)) // ignored, request will fail since backend server is restarted
          .finally(() => setTimeout(waitUntilServerIsOnline, 300));
      } else {
        setState(UpdateState.Finished);
      }
    }

    if (message.type === OSUpdaterMessageType.Size) {
      if (state === UpdateState.PreparingSystemUpgrade){
        setUpdateSize(message.payload.size);
      }

      try {
        const noUpdatesAvailable = !(message.payload.size.downloadSize || message.payload.size.requiredSpace);
        if (noUpdatesAvailable) {
          // no updates available - continue to system upgrade if was preparing web-portal, or finish page
          setState(state === UpdateState.PreparingWebPortal ? UpdateState.PreparingSystemUpgrade : UpdateState.Finished);
          setCheckingWebPortal(false);
        } else {
          // there's an update available - install if it's from web-portal or wait for user input
          setState(state === UpdateState.PreparingWebPortal ? UpdateState.UpgradingWebPortal : UpdateState.WaitingForUserInput);
        }
      } catch (_) {
        setError(ErrorType.GenericError);
      }
    }
  }, [message, socket]); // eslint-disable-line react-hooks/exhaustive-deps

  const serviceRestartTimoutMs = 30000;
  const timeoutServerStatusRequestMs = 300;
  const serverStatusRequestIntervalMs = 700;
  let elapsedWaitingTimeMs = 0;

  let waitUntilServerIsOnline = () => {
    const interval = setInterval(async () => {
      try {
        elapsedWaitingTimeMs += timeoutServerStatusRequestMs + serverStatusRequestIntervalMs;
        elapsedWaitingTimeMs >= serviceRestartTimoutMs && setError(ErrorType.GenericError);
        serverStatus({ timeout: timeoutServerStatusRequestMs })
          .then(() => clearInterval(interval))
          .catch(() => {})
        window.location.replace(window.location.pathname + "?all")
      } catch (_) {}
    }, serverStatusRequestIntervalMs);
  }

  return (
    <UpgradePage
      onNextClick={goToNextPage}
      onSkipClick={goToNextPage}
      onBackClick={goToPreviousPage}
      onStartUpgradeClick={() => {
        if (isOpen) {
          setState(UpdateState.UpgradingSystem);
          return;
        }
        setError(ErrorType.GenericError);
      }}
      onRetry={(useDefaultBackend: boolean) => {
        doRetry(useDefaultBackend)
      }}
      isCompleted={isCompleted}
      message={message}
      updateState={state}
      downloadSize={updateSize.downloadSize}
      requireBurn={requireBurn}
      shouldBurn={shouldBurn}
      error={error}
    />
  );
};
