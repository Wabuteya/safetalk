import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './MoodHistoryPage.css';

// Register the components Chart.js needs to build a line chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// MOCK DATA: Simulates mood entries for the last 30 days
const generateMockData = () => {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().slice(0, 10),
      mood: Math.floor(Math.random() * 5) + 1, // Random mood between 1 and 5
    });
  }
  return data;
};

const allMoodData = generateMockData();

const MoodHistoryPage = () => {
  const [timeFilter, setTimeFilter] = useState(30); // '7' or '30' days

  const filteredData = allMoodData.slice(-timeFilter);

  const chartData = {
    labels: filteredData.map(d => d.date),
    datasets: [
      {
        label: 'Daily Mood',
        data: filteredData.map(d => d.mood),
        borderColor: '#007BFF',
        backgroundColor: 'rgba(0, 123, 255, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Your Mood Over the Last ${timeFilter} Days`,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 1,
        max: 5,
        ticks: {
            stepSize: 1
        }
      },
    },
  };
  
  // Calculate average mood for the insights card
  const averageMood = (filteredData.reduce((sum, d) => sum + d.mood, 0) / filteredData.length).toFixed(1);

  return (
    <div className="mood-history-layout">
      <div className="page-header">
        <h1>Your Mood History</h1>
        <div className="time-filters">
          <button onClick={() => setTimeFilter(7)} className={timeFilter === 7 ? 'active' : ''}>
            Last 7 Days
          </button>
          <button onClick={() => setTimeFilter(30)} className={timeFilter === 30 ? 'active' : ''}>
            Last 30 Days
          </button>
        </div>
      </div>
      
      <div className="chart-container">
        <Line options={chartOptions} data={chartData} />
      </div>

      <div className="insights-container">
        <h3>Summary & Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>Average Mood</h4>
            <p className="insight-value">{averageMood}</p>
            <p className="insight-label">out of 5</p>
          </div>
          <div className="insight-card intelligent-prompt">
            <h4>Feeling Overwhelmed?</h4>
            <p>We've noticed your mood has been consistently low. Remember, support is just a click away.</p>
            <button className="book-session-btn">Book a Session with a Therapist</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoodHistoryPage;