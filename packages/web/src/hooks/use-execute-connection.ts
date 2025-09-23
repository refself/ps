import { useEffect, useState } from "react";

import { getConnectionStatus } from "../services/workflow-api";

type ConnectionStatus = {
  checking: boolean;
  hasOSClient: boolean;
  hasWebClient: boolean;
};

const initialState: ConnectionStatus = {
  checking: true,
  hasOSClient: false,
  hasWebClient: false,
};

export const useExecuteConnection = (workflowId: string | null): ConnectionStatus => {
  const [status, setStatus] = useState<ConnectionStatus>(initialState);

  useEffect(() => {
    if (!workflowId) {
      setStatus({ checking: false, hasOSClient: false, hasWebClient: false });
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const data = await getConnectionStatus();
        if (!cancelled) {
          setStatus({
            checking: false,
            hasOSClient: Boolean(data?.hasOSClient),
            hasWebClient: Boolean(data?.hasWebClient),
          });
        }
      } catch {
        if (!cancelled) {
          setStatus({ checking: false, hasOSClient: false, hasWebClient: false });
        }
      }
    };

    void load();
    const interval = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [workflowId]);

  return status;
};

export default useExecuteConnection;
