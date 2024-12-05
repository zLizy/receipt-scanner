import React, { useState, useRef } from 'react';
import ImageUploader from './components/ImageUploader';
import ReceiptDisplay from './components/ReceiptDisplay';
import Login from './components/Login';
import Register from './components/Register';
import LoadingSpinner from './components/LoadingSpinner';
import PieChart from './components/PieChart';
import BarChart from './components/BarChart';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

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
  const [timePeriod, setTimePeriod] = useState('daily');
  const [chartType, setChartType] = useState('pie');
  const [barPlotType, setBarPlotType] = useState('default');

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

  const handleImageUpload = async (imageFile) => {
    if (!authToken) {
      console.error('User is not authenticated or token is missing');
      return;
    }

    setLoading(true);
    const newData = await fetchReceiptData(imageFile);
    setReceiptData((prevData) => [...prevData, newData]);
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

  const handleEditReceipt = (updatedReceipt) => {
    setReceiptData((prevData) =>
      prevData.map((receipt) =>
        receipt.id === updatedReceipt.id ? updatedReceipt : receipt
      )
    );
  };

  const { labels, data } = view === 'category' ? getCategoryData() : getFilteredSubCategoryData();

  const onEdit = async (updatedReceipt) => {
    try {
      console.log('Updating receipt with ID:', updatedReceipt.id);
      const response = await fetch('http://localhost:5001/api/update-receipts/' + updatedReceipt.id, {
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

      const updatedData = await response.json();
      setReceiptData((prevData) =>
        prevData.map((receipt) =>
          receipt.id === updatedData.id ? updatedData : receipt
        )
      );

      console.log('Receipt updated successfully:', updatedData);
    } catch (error) {
      console.error('Error updating receipt:', error);
    }
  };

  const handleDelete = async (receiptId) => {
    try {
      console.log('Deleting receipt with ID:', receiptId);
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

      // Update local state to remove the deleted receipt
      setReceiptData((prevData) => prevData.filter(receipt => receipt.id !== receiptId));

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

    if (period === 'last30days') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    } else if (period === 'last3months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    } else if (period === 'last6months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    } else if (period === 'last12months') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
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

  // Function to generate random colors
  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
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

  return (
    <div className="App">
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
            style={{ margin: '20px 0' }}
          >
            <Tab label="Pie Chart" value="pie" />
            <Tab label="Bar Chart" value="bar" />
          </Tabs>
          {chartType === 'pie' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                <button onClick={() => setView('category')}>Category</button>
                <button onClick={() => setView('subcategory')}>Subcategory</button>
              </div>
              {view === 'subcategory' && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                  <select onChange={handleCategoryChange} value={selectedCategory}>
                    <option value="all">All</option>
                    {mainCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              )}
              <PieChart labels={labels} data={data} tabIndex="0" />
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                <select onChange={handleTimePeriodChange} value={timePeriod}>
                  <option value="last30days">Last 30 Days</option>
                  <option value="last3months">Last 3 Months</option>
                  <option value="last6months">Last 6 Months</option>
                  <option value="last12months">Last 12 Months</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                <select onChange={handleBarPlotTypeChange} value={barPlotType}>
                  <option value="default">Default</option>
                  <option value="allCategories">All Categories</option>
                  {mainCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', width: '80%', height: '400px', margin: '10px auto' }} tabIndex="0">
                <BarChart
                  labels={barPlotType === 'default' ? barChartData.labels : (barPlotType === 'allCategories' ? stackedBarChartData.labels : getStackedBarChartDataForSubcategories(barPlotType).labels)}
                  datasets={barPlotType === 'default' ? barChartData.datasets : (barPlotType === 'allCategories' ? stackedBarChartData.datasets : getStackedBarChartDataForSubcategories(barPlotType).datasets)}
                  options={getStackedBarChartDataForSubcategories(barPlotType).chartOptions}
                  stacked={barPlotType !== 'default'}
                />
              </div>
            </>
          )}
          <ImageUploader onUpload={handleImageUpload} />
          {loading && <LoadingSpinner />}
          {receiptData && (
            <ReceiptDisplay
              data={receiptData}
              onEdit={onEdit}
              onDelete={handleDelete}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
