import "../globals.css";
import type React from "react";
import { useEffect, useState } from "react";
import { datadogRum } from "@datadog/browser-rum";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { initialize } from "../helpers/i18n";
import { ENVIRONMENT } from "../helpers";
import Inbox from "../pages/inbox";
import Index from "../pages/index";
import Dm from "../pages/dm";
import useSingleTabGuard from "../hooks/useSingleTabGuard";
import { TabConflict } from "../component-library/components/TabConflict/TabConflict";
import { XmtpProvider } from "../contexts/XmtpContext";

const AppController: React.FC = () => {
  const [initialized, setInitialized] = useState(false);
  // browser-sdk's OPFS database allows only one live tab
  const { status: tabStatus, takeOver } = useSingleTabGuard();
  useEffect(() => {
    const initI18n = async () => {
      await initialize();
      setInitialized(true);
    };
    void initI18n();
  }, []);

  useEffect(() => {
    /* The initialization below will only happen 
    on our internal testing url (alpha.xmtp.chat)
    and is used for performance testing purposes.
    This tracking is meant to help surface insights 
    about performance based on team usage, and flag
    any performance degradations before they hit our
    production users. */
    if (window.location.hostname.includes(ENVIRONMENT.ALPHA)) {
      datadogRum.init({
        applicationId: import.meta.env.VITE_DATA_DOG_ID,
        clientToken: import.meta.env.VITE_DATA_DOG_TOKEN,
        site: "datadoghq.com",
        service: "inbox-web",
        env: "prod",
        sessionSampleRate: 100,
        sessionReplaySampleRate: 0,
        trackUserInteractions: false,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: "mask",
      });

      datadogRum.startSessionReplayRecording();
    }
  }, []);

  // TabConflict renders translated copy, so i18n has to be up first
  if (!initialized || tabStatus === "checking") {
    return null;
  }

  if (tabStatus === "blocked") {
    return <TabConflict onTakeOver={takeOver} />;
  }

  // XmtpProvider sits inside the tab guard so a blocked tab never opens a
  // second connection to the OPFS database
  return (
    <XmtpProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/dm/:address" element={<Dm />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </XmtpProvider>
  );
};

export default AppController;
