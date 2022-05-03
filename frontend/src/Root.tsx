import React from "react";
import { BrowserRouter, Route } from "react-router-dom";

import ErrorBoundary from "./components/errorBoundary/ErrorBoundary";
import OnboardingApp from "./components/onboarding_app/App";
import RestartPageContainer from "./pages/restartPage/RestartPageContainer";
import ErrorPage from "./pages/errorPage/ErrorPage";
import AboutPageContainer from "./pages/aboutPage/AboutPageContainer";
import UpgradePageContainer from "./pages/upgradePage/UpgradePageContainer";
import closeOsUpdaterWindow from "./services/closeOsUpdaterWindow";
import LandingPage from "./pages/landingPage/LandingPage";
import StandaloneWifiPageContainer from "./pages/wifiPage/StandaloneWifiPageContainer";

import { runningOnWebRenderer } from "./helpers/utils";

export default () => (
  <ErrorBoundary
    fallback={
      <ErrorBoundary fallback={<ErrorPage />}>
        <RestartPageContainer globalError />
      </ErrorBoundary>
    }
  >
    <BrowserRouter>
      <Route exact path="/landing" component={LandingPage} />
      <Route path="/onboarding" component={OnboardingApp} />
      <Route path="/about" component={AboutPageContainer} />
      <Route path="/wifi" component={StandaloneWifiPageContainer} />
      <Route
        path="/updater"
        render={() => (
          <UpgradePageContainer
            goToNextPage={closeOsUpdaterWindow}
            skipButtonLabel="Close"
            hideSkip={!runningOnWebRenderer()}
          />
        )}
      />
    </BrowserRouter>
  </ErrorBoundary>
);
