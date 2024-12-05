import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register the necessary components
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

function PieChart({ labels, data }) {
  // Combine labels and data for sorting
  const combinedData = labels.map((label, index) => ({
    label,
    value: data[index],
  }));

  // Sort combined data in descending order
  combinedData.sort((a, b) => b.value - a.value);

  // Extract sorted labels and data
  const sortedLabels = combinedData.map(item => item.label);
  const sortedData = combinedData.map(item => item.value);

  const chartData = {
    labels: sortedLabels,
    datasets: [
      {
        data: sortedData,
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw;
            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(2) + '%';
            return `${label}: ${value.toFixed(2)} (${percentage})`;
          }
        }
      },
      datalabels: {
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0).toFixed(2);
          const percentage = ((value / total) * 100).toFixed(2);
          return percentage >= 5 ? `${percentage}%` : '';
        },
        color: '#fff',
        display: true,
        anchor: 'end',
        align: 'start',
      },
    },
  };

  return (
    <div className="pie-chart-container">
      <Pie data={chartData} options={options} width={300} height={300} />
    </div>
  );
}

export default PieChart;