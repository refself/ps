import { useEffect, useState } from "react";

import { checkExecuteEndpoint } from "../services/execute-script-service";

export const useExecuteConnection = () => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      const result = await checkExecuteEndpoint();
      if (!cancelled) {
        setIsOnline(result);
      }
    };

    ping();

    const interval = window.setInterval(ping, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return isOnline;
};

export default useExecuteConnection;
