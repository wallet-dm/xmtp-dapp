import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDisconnect } from "wagmi";
import { Error as ErrorPage } from "../component-library/components/Error/Error";
import { InstallationLimit } from "../component-library/components/InstallationLimit/InstallationLimit";
import { OnboardingStep } from "../component-library/components/OnboardingStep/OnboardingStep";
import { classNames, isAppEnvDemo } from "../helpers";
import useInitXmtpClient from "../hooks/useInitXmtpClient";
import { useXmtpStore } from "../store/xmtp";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const resetXmtpState = useXmtpStore((state) => state.resetXmtpState);
  const { open } = useWeb3Modal();
  const {
    client,
    error,
    isLoading,
    status,
    resolveCreate,
    retry,
    disconnect,
    installations,
    revokeInstallations,
  } = useInitXmtpClient();
  const { reset: resetWagmi, disconnect: disconnectWagmi } = useDisconnect();

  useEffect(() => {
    // only route once the installation is registered; a client that still
    // needs its signature is not usable for messaging
    if (client && status === "ready") {
      navigate("/inbox");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, status]);

  const step = useMemo(() => {
    // special demo case that will skip onboarding
    if (isAppEnvDemo()) {
      return 0;
    }
    switch (status) {
      // client exists, waiting on the one signature that registers it
      case "unregistered":
      case "signing":
        return 2;
      // waiting on wallet connection
      default:
        return 1;
    }
  }, [status]);

  const handleDisconnect = () => {
    void disconnect();
    disconnectWagmi();
    resetWagmi();
    resetXmtpState();
  };

  // Registration cannot succeed until a slot is freed, so this gets a screen
  // of its own rather than the generic retry.
  if (status === "installation-limit") {
    return (
      <InstallationLimit
        installations={installations}
        isLoading={isLoading}
        onRevoke={() => {
          void revokeInstallations();
        }}
        onDisconnect={handleDisconnect}
      />
    );
  }

  // Without this the error status falls through to the connect step, which
  // looks like nothing happened and gives the user nothing to act on.
  if (status === "error") {
    return <ErrorPage onConnect={retry} details={error?.message} />;
  }

  return (
    <div className={classNames("h-dvh", "w-full", "overflow-auto")}>
      <OnboardingStep
        step={step}
        isLoading={isLoading}
        onConnect={open}
        onCreate={resolveCreate}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
};

export default OnboardingPage;
