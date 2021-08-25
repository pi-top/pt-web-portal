import React from "react";

import Dialog from "../../../components/atoms/dialog/Dialog";
import Button from "../../../components/atoms/button/Button";

import styles from "./NewOsVersionDialog.module.css";

export type Props = {
  active: boolean;
  requireBurn: boolean;
  shouldBurn: boolean;
  onClose: () => void;
};


export enum OsBurnExplanation {
  ShouldBurn = "There are major OS updates available, so the update process might take a while.",
  RequireBurn = "This OS version is out of date and not maintained anymore: your pi-top will not have the latest security updates and features.",
  ShouldBurnRecommendation = "We recommend you to download the latest version of pi‑topOS from https://pi-top.com",
  RequireBurnRecommendation = "Please, download the latest version of pi‑topOS in https://pi-top.com",
  GoToWebsite = "For more information, go to https://pi-top.com/help/out-of-date"
}

const getMessage = () => {
  return (
    <>
      <span className={styles.dialogTitle}>New pi‑topOS version available!</span>
    </>
  );
};

export default ({
  active,
  requireBurn,
  shouldBurn,
  onClose,
}: Props) => {

  return (
    <Dialog active={active} message={getMessage()} className={styles.newOsVersionAvailableDialog}>
      <div className={styles.content}>        

          <span className={styles.osUpgradeWarning}>
            {requireBurn && OsBurnExplanation.RequireBurn}
            {shouldBurn && !requireBurn && OsBurnExplanation.ShouldBurn}
          </span>
          <br></br>

          <span className={styles.osUpgradeWarning}>{OsBurnExplanation.GoToWebsite}</span>
          <br></br>

          <span className={styles.osUpgradeWarning}>
            {requireBurn && OsBurnExplanation.RequireBurnRecommendation}
            {shouldBurn && !requireBurn && OsBurnExplanation.ShouldBurnRecommendation}
          </span>
          <br></br>

        <div className={styles.actions}>
          <Button onClick={() => onClose()}>Close</Button>
        </div>
      </div>
    </Dialog>
  );
};
