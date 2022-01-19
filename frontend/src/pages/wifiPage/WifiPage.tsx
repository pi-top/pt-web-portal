import React, { useState } from "react";

import Layout from "../../components/layout/Layout";
import Select from "../../components/atoms/select/Select";

import wifiPageScreen from "../../assets/images/wifi-screen.png";
import refreshIcon from "../../assets/icons/refresh.svg";
import styles from "./WifiPage.module.css";

import Spinner from "../../components/atoms/spinner/Spinner";
import Button from "../../components/atoms/button/Button";
import ConnectDialogContainer from "./connectDialog/ConnectDialogContainer";
import { Network } from "../../types/Network";


export enum ErrorMessage {
  FetchNetworks = "There was a problem getting networks, please refresh the networks list or skip",
}

export enum ExplanationMessage {
  NotConnected = "Choose from the list below.",
  WiredConnection = "Looks like we're already online. You can still connect to a WiFi network.",
  WiFiConnection = "We've connected successfully."
}

export type Props = {
  onNextClick: () => void;
  onSkipClick: () => void;
  onBackClick: () => void;
  onRefreshClick: () => void;
  networks: Network[];
  isFetchingNetworks: boolean;
  fetchNetworksError: boolean;
  isConnected: boolean;
  connectedNetwork?: Network;
  setConnectedNetwork: (network: Network) => void;
};

export default ({
  onNextClick,
  onSkipClick,
  onBackClick,
  onRefreshClick,
  networks,
  isFetchingNetworks,
  fetchNetworksError,
  isConnected,
  connectedNetwork,
  setConnectedNetwork,
}: Props) => {
  const [selectedNetwork, setSelectedNetwork] = useState(connectedNetwork);
  const [isConnectDialogActive, setIsConnectDialogActive] = useState(false);

  const { ssid: selectedSSID, bssid: selectedBSSID, frequency: selectedFrequency } = selectedNetwork || {};
  const errorMessage = fetchNetworksError && ErrorMessage.FetchNetworks;
  const getExplanation = () => {
    if (connectedNetwork) {
      return ExplanationMessage.WiFiConnection;
    }
    if (isConnected) {
      return ExplanationMessage.WiredConnection;
    }
    return ExplanationMessage.NotConnected;
  }

  const createNetworkLabel = (ssid: string, frequency: string) => {
    if (!frequency) {
      return ssid;
    }
    return ssid + " [" + frequency + "]";
  };

  return (
    <>
      <Layout
        banner={{
          src: wifiPageScreen,
          alt: "wifi-page-banner",
        }}
        prompt={
          <>
            Connect me to <span className="green">WiFi</span>
          </>
        }
        explanation={getExplanation()}
        nextButton={{
          onClick: onNextClick,
          disabled: !isConnected,
        }}
        skipButton={{ onClick: onSkipClick }}
        backButton={{ onClick: onBackClick }}
      >
        <div className={styles.wifiSelectContainer}>
          <Select
            // force rerender when selected ssid changes
            key={selectedBSSID}
            value={
              selectedBSSID && selectedSSID && selectedFrequency && {
                value: selectedBSSID,
                label: createNetworkLabel(selectedSSID, selectedFrequency),
              }
            }
            options={networks.map(({ ssid, frequency, bssid }) => ({
              value: bssid,
              label: createNetworkLabel(ssid, frequency),
            }))}
            onChange={(newBSSID) => {
              setIsConnectDialogActive(true);
              setSelectedNetwork(
                networks.find((network) => newBSSID === network.bssid)
              );
            }}
            placeholder="Please select WiFi network..."
            isDisabled={isFetchingNetworks}
          />

          <div className={styles.selectDetailsContainer}>
            {isFetchingNetworks ? (
              <>
                <Spinner size={20} />{" "}
                <span className={styles.settingMessage}>
                  fetching networks...
                </span>
              </>
            ) : (
              <Button
                unstyled
                onClick={onRefreshClick}
                className={styles.refreshButton}
              >
                <img src={refreshIcon} alt="refresh-button" />
              </Button>
            )}
          </div>
        </div>

        {errorMessage && <span className={styles.error}>{errorMessage}</span>}
      </Layout>

      <ConnectDialogContainer
        active={isConnectDialogActive}
        network={selectedNetwork}
        setConnectedNetwork={setConnectedNetwork}
        onCancel={() => {
          setIsConnectDialogActive(false);
          setSelectedNetwork(undefined);
        }}
        onDone={() => {
          setIsConnectDialogActive(false)
          if (isConnected) {
            onNextClick();
          }
        }}
      />
    </>
  );
};
