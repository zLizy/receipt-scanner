import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register the necessary components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

function BarChart({ labels, datasets = [], stacked }) {
  // Filter out zero values from datasets
  const filteredDatasets = datasets.map(dataset => ({
    ...dataset,
    data: dataset.data.map((value, index) => (value !== 0 ? value : null)),
  }));

  const data = {
    labels,
    datasets: filteredDatasets,
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Spending Over Time',
      },
      datalabels: {
        color: 'lightgrey',
        display: function(context) {
          return context.dataset.data[context.dataIndex] !== 0;
        }
      }
    },
    scales: {
      x: {
        stacked: stacked,
      },
      y: {
        stacked: stacked,
        ticks: {
          callback: function(value) {
            return value !== 0 ? value : null; // Hide zero values on y-axis
          },
        },
      },
    },
  };

  return <Bar data={data} options={options} />;
}

export default BarChart;
