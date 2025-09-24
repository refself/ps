import { useEffect, useState } from "react";
import { getConnectionStatus } from "../services/workflow-api";
const initialState = {
    checking: true,
    hasOSClient: false,
    hasWebClient: false,
};
export const useExecuteConnection = (workflowId) => {
    const [status, setStatus] = useState(initialState);
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
            }
            catch {
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
