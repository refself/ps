import { useEffect, useState, useCallback } from 'react';
import { listRecordings, getRecordingDetail } from '../services/recording-api';
export const useRecordings = (workflowId) => {
    const [state, setState] = useState({
        recordings: [],
        loading: false,
        error: null
    });
    const refreshRecordings = useCallback(async () => {
        if (!workflowId) {
            setState({ recordings: [], loading: false, error: null });
            return;
        }
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const recordings = await listRecordings(workflowId);
            setState({ recordings, loading: false, error: null });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recordings';
            setState({ recordings: [], loading: false, error: errorMessage });
        }
    }, [workflowId]);
    const getRecording = useCallback(async (recordingId) => {
        if (!workflowId)
            return null;
        try {
            return await getRecordingDetail(workflowId, recordingId);
        }
        catch (error) {
            console.error('Failed to fetch recording detail:', error);
            return null;
        }
    }, [workflowId]);
    // Auto-refresh recordings when workflowId changes
    useEffect(() => {
        void refreshRecordings();
    }, [refreshRecordings]);
    // Auto-refresh recordings every 5 seconds to catch new recordings
    useEffect(() => {
        if (!workflowId)
            return;
        const interval = setInterval(() => {
            void refreshRecordings();
        }, 5000);
        return () => clearInterval(interval);
    }, [workflowId, refreshRecordings]);
    return {
        recordings: state.recordings,
        loading: state.loading,
        error: state.error,
        refreshRecordings,
        getRecording
    };
};
export default useRecordings;
