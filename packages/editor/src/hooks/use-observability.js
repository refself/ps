import { useEffect, useState } from "react";
export const useObservability = (config) => {
    const [state, setState] = useState({
        status: config ? "ready" : "idle",
        recordings: [],
        toolRequests: [],
        connection: undefined,
    });
    useEffect(() => {
        if (!config) {
            setState({ status: "idle", recordings: [], toolRequests: [], connection: undefined });
            return;
        }
        // NO HTTP POLLING! Use only WebSocket-provided data
        const { connectionStatus } = config;
        setState({
            status: "ready",
            recordings: [], // Recordings come from separate recording service
            toolRequests: [], // Tool requests come via WebSocket (not implemented yet)
            connection: connectionStatus || { hasOSClient: false, hasWebClient: false },
        });
        console.log('useObservability: Using WebSocket-only mode, no HTTP polling');
    }, [config?.connectionStatus]);
    return state;
};
