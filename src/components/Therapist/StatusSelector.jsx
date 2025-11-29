import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import './StatusSelector.css';

const StatusSelector = ({ userId }) => {
    const [currentStatus, setCurrentStatus] = useState('offline');

    useEffect(() => {
        // Fetch the initial status when the component loads
        const fetchStatus = async () => {
            if (!userId) return;
            const { data } = await supabase
                .from('therapist_profiles')
                .select('status')
                .eq('user_id', userId)
                .single();
            if (data && data.status) {
                setCurrentStatus(data.status);
            }
        };
        fetchStatus();
    }, [userId]);

    const handleStatusChange = async (newStatus) => {
        if (!userId) return;
        setCurrentStatus(newStatus);
        
        // Update the status in the database
        await supabase
            .from('therapist_profiles')
            .update({ status: newStatus })
            .eq('user_id', userId);
    };

    return (
        <div className="status-selector">
            <span className={`status-dot ${currentStatus}`}></span>
            <select value={currentStatus} onChange={(e) => handleStatusChange(e.target.value)}>
                <option value="online">Online</option>
                <option value="away">Away</option>
                <option value="offline">Offline</option>
            </select>
        </div>
    );
};

export default StatusSelector;