import React, { useState, useRef, useMemo } from 'react';
import { Chart, LineElement, PointElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ImageUploader from './components/ImageUploader';
import ReceiptDisplay from './components/ReceiptDisplay';
import Login from './components/Login';
import Register from './components/Register';
import LoadingSpinner from './components/LoadingSpinner';
import PieChart from './components/PieChart';
import BarChart from './components/BarChart';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

// Register the components
Chart.register(LineElement, PointElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

function CategoryMapDisplay({ categoryMap }) {
  return (
    <div>
      <h2>Category Map</h2>
      <ul>
        {Object.entries(categoryMap).map(([category, total]) => (
          <li key={category}>
            {category}: ${total.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  const [receiptData, setReceiptData] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [view, setView] = useState('category');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timePeriod, setTimePeriod] = useState('last30days');
  const [chartType, setChartType] = useState('pie');
  const [barPlotType, setBarPlotType] = useState('default');
  const [showLine, setShowLine] = useState(false);
  const [layout, setLayout] = useState('three-columns');
  const [sortOption, setSortOption] = useState('date-desc');

  const mainCategories = [...new Set(receiptData.map(receipt => receipt.category))];

  // Ref to store category colors
  const categoryColorsRef = useRef({});

  const handleLogin = (userData) => {
    if (!userData || !userData.token) {
      console.error('Login failed: userData or token is undefined');
      return;
    }
    setUser(userData);
    setAuthToken(userData.token);
    fetchUserData(userData.token);
  };

  const fetchUserData = async (token) => {
    const response = await fetch('http://localhost:5001/api/user-data', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    // console.log('Fetched user data:', JSON.stringify(data, null, 2));
    setReceiptData(data);
  };

  const isDuplicateReceipt = (newReceipt, existingReceipts) => {
    return existingReceipts.some(receipt => {
      const isSameTime = new Date(receipt.date).getTime() === new Date(newReceipt.date).getTime();
      const isSamePlace = receipt.place === newReceipt.place;
      const areItemsSimilar = receipt.items.length === newReceipt.items.length &&
        receipt.items.every((item, index) => item.name === newReceipt.items[index].name && item.price === newReceipt.items[index].price);

      return isSameTime && isSamePlace && areItemsSimilar;
    });
  };

  const handleImageUpload = async (imageFile) => {
    if (!authToken) {
      console.error('User is not authenticated or token is missing');
      return;
    }

    setLoading(true);
    const newData = await fetchReceiptData(imageFile);

    if (newData && !isDuplicateReceipt(newData, receiptData)) {
      setReceiptData((prevData) => [...prevData, newData]);
    } else {
      console.warn('Duplicate receipt detected, not adding to the list.');
    }

    setLoading(false);
  };

  const fetchReceiptData = async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    console.log('Sending token:', authToken);
    try {
      const response = await fetch('http://localhost:5001/api/scan-receipt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch receipt data');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching receipt data:', error);
      return null;
    }
  };

  const getCategoryData = () => {
    const categoryMap = receiptData.reduce((acc, receipt) => {
      const category = receipt.category;
      const total = parseFloat(receipt.total) || 0;
  
      if (acc[category]) {
        acc[category] += total;
      } else {
        acc[category] = total;
      }
      return acc;
    }, {});
    const labels = Object.keys(categoryMap);
    const data = Object.values(categoryMap);

    return { labels, data };
  };

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
  };

  const getFilteredSubCategoryData = () => {
    const subCategoryMap = {};

    receiptData.forEach(receipt => {
      if (selectedCategory === 'all' || receipt.category === selectedCategory) {
        receipt.items.forEach(item => {
          const subcategory = item.subcategory;
          const price = item.price * item.quantity;

          if (subCategoryMap[subcategory]) {
            subCategoryMap[subcategory] += price;
          } else {
            subCategoryMap[subcategory] = price;
          }
        });
      }
    });

    const labels = Object.keys(subCategoryMap);
    const data = Object.values(subCategoryMap);

    return { labels, data };
  };


  const { labels, data } = view === 'category' ? getCategoryData() : getFilteredSubCategoryData();

  const onEdit = async (updatedReceipt) => {
    try {
      // Check if the updatedReceipt has a valid id
      if (!updatedReceipt._id) {
        console.error('Updated receipt is missing an ID:', updatedReceipt);
        return;
      }

      console.log('Updating receipt.');
      const response = await fetch('http://localhost:5001/api/update-receipts/' + updatedReceipt._id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(updatedReceipt),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update receipt: ${errorText}`);
      }

      setReceiptData((prevData) =>
        prevData.map((receipt) =>
          receipt._id === updatedReceipt._id ? updatedReceipt : receipt
        )
      );

      // console.log('Receipt updated successfully:', updatedData);
    } catch (error) {
      console.error('Error updating receipt:', error);
    }
  };

  const handleDelete = async (receiptId) => {
    try {
      console.log('Deleting receipt');
      const response = await fetch(`http://localhost:5001/api/delete-receipts/${receiptId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete receipt: ${errorText}`);
      }

      setReceiptData((prevData) => prevData.filter(receipt => receipt._id !== receiptId));

      console.log('Receipt deleted successfully');
    } catch (error) {
      console.error('Error deleting receipt:', error);
    }
  };

  const handleTimePeriodChange = (event) => {
    setTimePeriod(event.target.value);
  };

  const getTimePeriodData = (period) => {
    const periodMap = {};
    const now = new Date();
    let startDate;

    switch (period) {
      case 'last30days':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        break;
      case 'last3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'last6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case 'last12months':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        console.error('Invalid time period:', period);
        return { labels: [], data: [] }; // Return empty data to prevent further errors
    }

    console.log('Start Date:', startDate);
    console.log('Now:', now);

    // Initialize periodMap with all dates in the selected range
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      let key;
      if (period === 'last30days') {
        key = d.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        key = d.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
      }
      periodMap[key] = 0;
    }

    console.log('Initialized Period Map:', periodMap);

    receiptData.forEach(receipt => {
      const date = new Date(receipt.date);
      if (isNaN(date.getTime())) {
        console.error('Invalid receipt date:', receipt.date);
        return; // Skip invalid dates
      }

      let key;
      if (period === 'last30days') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        key = date.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
      }

      if (periodMap[key] !== undefined) {
        const total = parseFloat(receipt.total) || 0;
        periodMap[key] += total;
        periodMap[key] = parseFloat(periodMap[key].toFixed(2));
      }
    });

    console.log('Final Period Map:', periodMap);

    const labels = Object.keys(periodMap);
    const data = Object.values(periodMap);

    return { labels, data };
  };

  const { labels: barLabels, data: barData } = getTimePeriodData(timePeriod);


  const barChartData = {
    labels: barLabels,
    datasets: [
      {
        label: 'Total Spending',
        data: barData,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const handleChartTypeChange = (event, newValue) => {
    setChartType(newValue);
  };

  const handleBarPlotTypeChange = (event) => {
    setBarPlotType(event.target.value);
  };

  // Predefined color palette from Color Hunt
  const colorPalette = [
    '#FF6B6B', // Red
    '#FFD93D', // Yellow
    '#6BCB77', // Green
    '#4D96FF', // Blue
    '#FF6F91', // Pink
    '#845EC2', // Purple
    '#FFC75F', // Orange
    '#F9F871', // Light Yellow
    '#00C9A7', // Teal
    '#C34A36', // Brown
  ];

  // Function to get a random color from the predefined palette
  const getRandomColor = () => {
    const randomIndex = Math.floor(Math.random() * colorPalette.length);
    return colorPalette[randomIndex];
  };

  // Function to determine if a color is bright
  const isColorBright = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Calculate brightness using the luminance formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 175; // Threshold for brightness
  };

  // Function to get color for a category
  const getCategoryColor = (category) => {
    if (!categoryColorsRef.current[category]) {
      categoryColorsRef.current[category] = getRandomColor();
    }
    return categoryColorsRef.current[category];
  };

  // Function to get label color based on background color
  const getLabelColor = (backgroundColor) => {
    return isColorBright(backgroundColor) ? 'black' : 'white';
  };

  const getStackedBarChartData = (period) => {
    const periodMap = {};
    const now = new Date();
    let startDate;

    if (period === 'last30days') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    } else if (period === 'last3months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    } else if (period === 'last6months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    } else if (period === 'last12months') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }

    // Initialize periodMap with all dates in the selected range
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      let key;
      if (period === 'last30days') {
        key = d.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        key = d.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
      }
      periodMap[key] = {};
    }

    receiptData.forEach(receipt => {
      const date = new Date(receipt.date);
      if (isNaN(date.getTime())) {
        console.error('Invalid receipt date:', receipt.date);
        return; // Skip invalid dates
      }
      const key = date.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
      const category = receipt.category;
      const total = parseFloat(receipt.total) || 0;

      if (periodMap[key] !== undefined) {
        if (!periodMap[key][category]) {
          periodMap[key][category] = 0;
        }
        periodMap[key][category] += total;
      }
    });

    // Sort the labels to ensure correct order
    const labels = Object.keys(periodMap).sort();
    const datasets = mainCategories.map(category => ({
      label: category,
      data: labels.map(label => periodMap[label][category] || 0),
      backgroundColor: getCategoryColor(category), // Use static color for each category
    }));

    return { labels, datasets };
  };

  const stackedBarChartData = getStackedBarChartData(timePeriod);

  const getStackedBarChartDataForSubcategories = (mainCategory) => {
    const periodMap = {};
    const now = new Date();
    let startDate;

    if (timePeriod === 'last30days') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    } else if (timePeriod === 'last3months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    } else if (timePeriod === 'last6months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    } else if (timePeriod === 'last12months') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }

    // Initialize periodMap with all dates in the selected range
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      let key;
      if (timePeriod === 'last30days') {
        key = d.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        key = d.toISOString().split('T')[0].slice(0, 7); // YYYY-MM
      }
      periodMap[key] = {};
    }

    receiptData.forEach(receipt => {
      if (receipt.category === mainCategory) {
        const date = new Date(receipt.date);
        const key = date.toISOString().split('T')[0].slice(0, 7); // YYYY-MM

        receipt.items.forEach(item => {
          const subcategory = item.subcategory;
          const total = item.price * item.quantity;

          if (periodMap[key] !== undefined) {
            if (!periodMap[key][subcategory]) {
              periodMap[key][subcategory] = 0;
            }
            periodMap[key][subcategory] += total;
            periodMap[key][subcategory] = parseFloat(periodMap[key][subcategory].toFixed(2));
          }
        });
      }
    });

    // Sort the labels to ensure correct order
    const labels = Object.keys(periodMap).sort();
    const subcategories = new Set(receiptData.flatMap(receipt => receipt.category === mainCategory ? receipt.items.map(item => item.subcategory) : []));
    const datasets = Array.from(subcategories).map(subcategory => {
      const backgroundColor = getCategoryColor(subcategory);
      return {
        label: subcategory,
        data: labels.map(label => periodMap[label][subcategory] || 0),
        backgroundColor: backgroundColor,
        borderColor: backgroundColor,
        borderWidth: 1,
        labelColor: getLabelColor(backgroundColor),
      };
    });

    // Chart options to enhance label visibility
    const chartOptions = {
      plugins: {
        datalabels: {
          color: (context) => {
            const backgroundColor = context.dataset.backgroundColor;
            return isColorBright(backgroundColor) ? 'black' : 'white';
          },
          font: {
            size: 14, // Increase font size
            weight: 'bold',
          },
          textStrokeColor: 'rgba(0, 0, 0, 0.5)', // Add text stroke for better contrast
          textStrokeWidth: 2,
        },
      },
    };

    return { labels, datasets, chartOptions };
  };

  const handleToggleLine = () => {
    setShowLine(prevShowLine => !prevShowLine);
  };

  const lineDataset = {
    ...(showLine ? {} : { label: 'Total Spending Line' }),
    data: barData,
    type: 'line',
    borderColor: 'rgba(255, 99, 132, 1)',
    borderWidth: 2,
    fill: false,
    datalabels: {
      display: false, // Disable data labels for the line
    },
  };

  const combinedDatasets = showLine
    ? [...barChartData.datasets, lineDataset]
    : barChartData.datasets;

  const handleLayoutChange = (e) => {
    setLayout(e.target.value);
  };

  const handleSortChange = (event) => {
    setSortOption(event.target.value);
  };

  const sortedReceiptData = useMemo(() => {
    return [...receiptData].sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.date) - new Date(a.date);
        case 'date-asc':
          return new Date(a.date) - new Date(b.date);
        case 'total-desc':
          return b.total - a.total;
        case 'total-asc':
          return a.total - b.total;
        default:
          return 0;
      }
    });
  }, [receiptData, sortOption]);

  return (
    <div className="App" style={{ margin: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1>Receipt Scanner</h1>
      {!user ? (
        <>
          <Login onLogin={handleLogin} />
          <Register />
        </>
      ) : (
        <>
          <Tabs
            value={chartType}
            onChange={handleChartTypeChange}
            centered
            style={{ margin: '10px 0', width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'center' }}
          >
            <Tab label="Pie Chart" value="pie" />
            <Tab label="Bar Chart" value="bar" />
          </Tabs>
          {chartType === 'pie' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0', width: '100%', maxWidth: '600px' }}>
                <button onClick={() => setView('category')}>Category</button>
                <button onClick={() => setView('subcategory')}>Subcategory</button>
              </div>
              {view === 'subcategory' && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '5px 0', width: '100%', maxWidth: '600px' }}>
                  <select onChange={handleCategoryChange} value={selectedCategory}>
                    <option value="all">All</option>
                    {mainCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '5px 0', width: '100%', maxWidth: '600px' }}>
                <PieChart labels={labels} data={data} tabIndex="0" />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '5px 0', width: '100%', maxWidth: '600px' }}>
                <select onChange={handleTimePeriodChange} value={timePeriod}>
                  <option value="last30days">Last 30 Days</option>
                  <option value="last3months">Last 3 Months</option>
                  <option value="last6months">Last 6 Months</option>
                  <option value="last12months">Last 12 Months</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '5px 0', width: '100%', maxWidth: '600px' }}>
                <select onChange={handleBarPlotTypeChange} value={barPlotType}>
                  <option value="default">Default</option>
                  <option value="allCategories">All Categories</option>
                  {mainCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              {barPlotType === 'default' && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '5px 0', width: '100%', maxWidth: '600px' }}>
                  <button onClick={handleToggleLine}>
                    {showLine ? 'Hide Line' : 'Show Line'}
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', width: '80%', height: '400px', margin: '10px auto' }} tabIndex="0">
                <BarChart
                  labels={barPlotType === 'default' ? barChartData.labels : (barPlotType === 'allCategories' ? stackedBarChartData.labels : getStackedBarChartDataForSubcategories(barPlotType).labels)}
                  datasets={barPlotType === 'default' ? combinedDatasets : (barPlotType === 'allCategories' ? stackedBarChartData.datasets : getStackedBarChartDataForSubcategories(barPlotType).datasets)}
                  options={{
                    ...getStackedBarChartDataForSubcategories(barPlotType).chartOptions,
                    plugins: {
                      datalabels: {
                        display: (context) => context.dataset.type !== 'line', // Only display labels for non-line datasets
                      },
                    },
                  }}
                  stacked={barPlotType !== 'default'}
                />
              </div>
            </>
          )}
          <h2>Upload Your Receipt</h2>
          <ImageUploader onUpload={handleImageUpload} />
          {loading && <LoadingSpinner />}
          {receiptData && (
            <>
              <h2>Your Receipts</h2>
              <div style={{ marginBottom: '2px' }}>
                <label htmlFor="layout-options">Layout: </label>
                <select id="layout-options" value={layout} onChange={handleLayoutChange} style={{ marginLeft: '10px', marginRight: '20px' }}>
                  <option value="three-columns">Three Columns</option>
                  <option value="one-column">One Column</option>
                </select>
                <label htmlFor="sort-options">Sort by: </label>
                <select id="sort-options" onChange={handleSortChange} value={sortOption}>
                  <option value="date-desc">Date (Newest First)</option>
                  <option value="date-asc">Date (Oldest First)</option>
                  <option value="total-desc">Total Amount (High to Low)</option>
                  <option value="total-asc">Total Amount (Low to High)</option>
                </select>
              </div>
              <ReceiptDisplay
                data={sortedReceiptData}
                onEdit={onEdit}
                onDelete={handleDelete}
                layout={layout}
                style={{ marginTop: '0px' }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
