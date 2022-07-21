import React, { memo, useCallback, useEffect, useMemo, useState } from "react";

import Layout from "../layout/Layout";

import styles from "./WebVncDesktopLanding.module.css";
import keyboardScreen from "../../assets/images/keyboard-screen.png";
import Spinner from "../atoms/spinner/Spinner";
import vncServiceStatus from "../../services/vncServiceStatus";
import { runningOnWebRenderer } from "../../helpers/utils";


enum VncServiceState {
  Stopped = "STOPPED",
  Running = "RUNNING",
  Error = "ERROR",
}

const WebVncDesktopLanding = () => {
  const [vncServiceState, setVncServiceState] = useState<VncServiceState>();

  const initialiseVncServiceState = useCallback(async () => {
    try {
      const data = await vncServiceStatus();
      return setVncServiceState(
        data.isRunning ? VncServiceState.Running : VncServiceState.Stopped
      );
    } catch (_) {
      return setVncServiceState(VncServiceState.Error);
    }
  }, []);

  const { content, buttonLabel, buttonDisabled, onButtonClick } =
    useMemo(() => {
      switch (vncServiceState) {
        case VncServiceState.Running:
          return {
            buttonLabel: "Let's Go!",
            onButtonClick: () => window.open("/desktop"),
            content: (
              <>
                Access programs and resources on your pi-top as if you were actually working on it!
              </>
            ),
          };

        case VncServiceState.Stopped:
          return {
            buttonLabel: "Let's Go!",
            buttonDisabled: true,
            content: (
              <>
                The VNC service is not enabled in your device. Make sure to enable it and try again.
                <br />
                If your device is a pi-top[4], you can do this by navigating to the Settings menu in you miniscreen.
              </>
            ),
          };

        case VncServiceState.Error:
          return {
            buttonLabel: "Let's Go!",
            buttonDisabled: true,
            content: (
              <>
                There was an error while fetching your device state. Please try again later.
              </>
            ),
          };

        default:
          return {
            content: (
              <>
                <p>Getting VNC service status...</p>
                <Spinner size={45} />
              </>
            ),
            buttonLabel: "Let's Go!",
            buttonDisabled: true,
          };
      }
    }, [vncServiceState]);

  // initialise state on mount
  useEffect(() => {
    // don't bother initialising if on web renderer
    if (runningOnWebRenderer()) return;

    initialiseVncServiceState();
  }, [initialiseVncServiceState]);

  return (
    <Layout
      banner={{
        src: keyboardScreen,
        alt: "remote desktop banner",
      }}
      prompt={
        <>
          Want to access your device <span className="green">desktop</span>?
        </>
      }
      nextButton={{
        label: buttonLabel,
        disabled: buttonDisabled,
        onClick: onButtonClick,
      }}
      className={styles.root}
      showHeader={false}
    >
      {
        <div className={styles.content}>
          {runningOnWebRenderer() ? (
            <p>
              Remote desktop cannot be used when on your pi-top. Open{" "}
              <span className="green">pi-top.local</span> or the IP address on
              your miniscreen on a separate computer.
            </p>
          ) : (
            content
          )}
        </div>
      }
    </Layout>
  );
};

export default memo(WebVncDesktopLanding);
