import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import ReceiptDisplay from './components/ReceiptDisplay';
import Login from './components/Login';
import Register from './components/Register';
import LoadingSpinner from './components/LoadingSpinner';
import PieChart from './components/PieChart';
import BarChart from './components/BarChart';

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

  const mainCategories = [...new Set(receiptData.map(receipt => receipt.category))];

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
      const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
      periodMap[key] = 0;
    }

    console.log('Initialized Period Map:', periodMap);

    receiptData.forEach(receipt => {
      const date = new Date(receipt.date);
      const key = date.toISOString().split('T')[0];

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
          <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
            <select onChange={handleTimePeriodChange} value={timePeriod}>
              <option value="last30days">Last 30 Days</option>
              <option value="last3months">Last 3 Months</option>
              <option value="last6months">Last 6 Months</option>
              <option value="last12months">Last 12 Months</option>
            </select>
          </div>
          {/* <div>
            <h2>Time Period Data</h2>
            {barLabels.map((label, index) => (
              <p key={label}>{label}: ${barData[index].toFixed(2)}</p>
            ))}
          </div> */}
          <div style={{ display: 'flex', justifyContent: 'center', width: '80%', height: '500px', margin: '10px auto' }} tabIndex="0">
            <BarChart labels={barChartData.labels} datasets={barChartData.datasets} stacked={false} />
          </div>
          
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
