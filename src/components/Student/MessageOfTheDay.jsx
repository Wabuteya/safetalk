import React, { useState, useEffect } from 'react';
import { FaQuoteLeft } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import './MessageOfTheDay.css';

const MessageOfTheDay = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Fallback message if no message exists for today
  const fallbackMessage = "You don't have to have everything figured out today. One step is enough.";

  useEffect(() => {
    const fetchTodaysMessage = async () => {
      try {
        setLoading(true);
        
        // Get today's date in YYYY-MM-DD format (local timezone)
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        
        console.log('Fetching message for date:', todayStr);

        // Query Supabase for today's message
        const { data, error } = await supabase
          .from('message_of_the_day')
          .select('message_text')
          .eq('message_date', todayStr)
          .maybeSingle(); // Use maybeSingle to handle case where no message exists

        if (error) {
          console.error('Error fetching message of the day:', error);
          // Use fallback message on error
          setMessage(fallbackMessage);
        } else if (data && data.message_text) {
          // Use the message from database
          setMessage(data.message_text);
        } else {
          // No message found for today, use fallback
          console.log('No message found for today, using fallback');
          setMessage(fallbackMessage);
        }
      } catch (err) {
        console.error('Error in fetchTodaysMessage:', err);
        // Use fallback message on exception
        setMessage(fallbackMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTodaysMessage();
  }, []); // Empty dependency array - only fetch once on mount

  // Show loading state (minimal, just a subtle placeholder)
  if (loading) {
    return (
      <div className="message-of-the-day">
        <div className="motd-label">
          <FaQuoteLeft className="motd-icon" />
          Today's Message
        </div>
        <div className="motd-content">
          <div className="motd-text-placeholder">Loading today's message...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-of-the-day">
      <div className="motd-label">
        <FaQuoteLeft className="motd-icon" />
        Today's Message
      </div>
      <div className="motd-content">
        <p className="motd-text">{message}</p>
      </div>
    </div>
  );
};

export default MessageOfTheDay;

