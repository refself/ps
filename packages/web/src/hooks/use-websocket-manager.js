import { useEffect, useState } from 'react';
import webSocketManager from '../services/websocket-manager';
export const useWebSocketManager = () => {
    const [status, setStatus] = useState({
        connected: false,
        hasOSClient: false,
        hasWebClient: false
    });
    useEffect(() => {
        const listener = {
            onStatusChange: (newStatus) => {
                console.log('useWebSocketManager: Status changed:', newStatus);
                setStatus(newStatus);
            }
        };
        webSocketManager.addListener(listener);
        // Try to establish connection on mount
        webSocketManager.getConnection().catch(error => {
            console.error('Failed to establish initial connection:', error);
        });
        return () => {
            webSocketManager.removeListener(listener);
        };
    }, []);
    return {
        status,
        manager: webSocketManager
    };
};
export default useWebSocketManager;
