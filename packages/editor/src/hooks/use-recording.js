import { useCallback, useState } from 'react';
export const useRecording = ({ onStartRecording, onStopRecording }) => {
    const [busy, setBusy] = useState(false);
    const startRecording = useCallback(async () => {
        if (!onStartRecording) {
            return;
        }
        setBusy(true);
        try {
            await onStartRecording();
        }
        catch (error) {
            console.error('Failed to start recording', error);
        }
        finally {
            setBusy(false);
        }
    }, [onStartRecording]);
    const stopRecording = useCallback(async (recordingId) => {
        if (!onStopRecording) {
            return;
        }
        setBusy(true);
        try {
            await onStopRecording(recordingId);
        }
        catch (error) {
            console.error('Failed to stop recording', error);
        }
        finally {
            setBusy(false);
        }
    }, [onStopRecording]);
    return {
        busy,
        startRecording,
        stopRecording,
    };
};
