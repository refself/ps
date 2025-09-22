import { useEffect, useState } from "react";

import { checkExecuteEndpoint } from "../services/execute-script-service";

type ConnectionStatus = boolean | null;

export const useExecuteConnection = (): ConnectionStatus => {
  const [status, setStatus] = useState<ConnectionStatus>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const ok = await checkExecuteEndpoint();
        if (!cancelled) {
          setStatus(ok);
        }
      } catch {
        if (!cancelled) {
          setStatus(false);
        }
      }
    };

    check();
    const interval = window.setInterval(check, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return status;
};

export default useExecuteConnection;
