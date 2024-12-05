import React, { useState } from 'react';
import './ReceiptDisplay.css';

const RECEIPTS_PER_PAGE = 30;

function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ReceiptDisplay({ data, onEdit, onDelete, layout }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [expandedReceiptIndex, setExpandedReceiptIndex] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / RECEIPTS_PER_PAGE);

  const handleEditClick = (receipt) => {
    setIsEditing(true);
    setCurrentReceipt(receipt);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('items[')) {
      const [_, index, field] = name.match(/items\[(\d+)\]\.(\w+)/);
      const updatedItems = [...currentReceipt.items];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
      setCurrentReceipt({ ...currentReceipt, items: updatedItems });
    } else {
      setCurrentReceipt({ ...currentReceipt, [name]: value });
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onEdit(currentReceipt);
    setIsEditing(false);
    setCurrentReceipt(null);
  };

  const toggleShowMore = (index) => {
    setExpandedReceiptIndex(expandedReceiptIndex === index ? null : index);
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const existingCategories = [...new Set(data.map(receipt => receipt.category))];
  const existingSubcategories = [...new Set(data.flatMap(receipt => receipt.items.map(item => item.subcategory)))];

  if (!data || data.length === 0) {
    return <p>No receipt data available.</p>;
  }

  const startIndex = (currentPage - 1) * RECEIPTS_PER_PAGE;
  const currentReceipts = data.slice(startIndex, startIndex + RECEIPTS_PER_PAGE);

  return (
    <div className="receipt-container">
      {isEditing ? (
        <form onSubmit={handleFormSubmit}>
          <label>
            Date:
            <input
              type="text"
              name="date"
              value={currentReceipt.date}
              onChange={handleFormChange}
            />
          </label>
          <label>
            Category:
            <input
              list="categories"
              type="text"
              name="category"
              value={currentReceipt.category}
              onChange={handleFormChange}
            />
            <datalist id="categories">
              {existingCategories.map((category, index) => (
                <option key={index} value={category} />
              ))}
            </datalist>
          </label>
          <label>
            Place:
            <input
              type="text"
              name="place"
              value={currentReceipt.place}
              onChange={handleFormChange}
            />
          </label>
          <label>
            Total:
            <input
              type="number"
              name="total"
              value={currentReceipt.total}
              onChange={handleFormChange}
            />
          </label>
          {currentReceipt.items && currentReceipt.items.map((item, index) => (
            <div key={index}>
              <label>
                Subcategory:
                <input
                  list="subcategories"
                  type="text"
                  name={`items[${index}].subcategory`}
                  value={item.subcategory}
                  onChange={handleFormChange}
                />
                <datalist id="subcategories">
                  {existingSubcategories.map((subcategory, subIndex) => (
                    <option key={subIndex} value={subcategory} />
                  ))}
                </datalist>
              </label>
              <label>
                Name:
                <input
                  type="text"
                  name={`items[${index}].name`}
                  value={item.name}
                  onChange={handleFormChange}
                />
              </label>
              <label>
                Price:
                <input
                  type="number"
                  name={`items[${index}].price`}
                  value={item.price}
                  onChange={handleFormChange}
                />
              </label>
              <label>
                Quantity:
                <input
                  type="number"
                  name={`items[${index}].quantity`}
                  value={item.quantity}
                  onChange={handleFormChange}
                />
              </label>
            </div>
          ))}
          <button type="submit">Save</button>
          <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
        </form>
      ) : (
        <div className={`receipt-list ${layout}`}>
          {currentReceipts.map((receipt, index) => (
            <div key={index} className="receipt-block">
              <h2 className="receipt-date">{receipt.date ? formatDate(receipt.date) : 'N/A'}</h2>
              <div className="receipt-details">
                <p><strong>Category:</strong> {receipt.category || 'N/A'}</p>
                <p><strong>Place:</strong> {receipt.place || 'N/A'}</p>
                <p><strong>Total:</strong> ${receipt.total ? parseFloat(receipt.total).toFixed(2) : '0.00'}</p>
              </div>
              {(expandedReceiptIndex === index) && (
                <div className="receipt-items">
                  <p><strong>Items:</strong></p>
                  <ul>
                    {receipt.items && receipt.items.length > 0 ? (
                      receipt.items.map((item, itemIndex) => (
                        <li key={itemIndex} className={layout === 'one-column' ? 'item-row' : ''}>
                          {item.subcategory ? `${item.subcategory} - ` : ''}{item.name}: ${item.price ? item.price.toFixed(2) : '0.00'} x {item.quantity}
                        </li>
                      ))
                    ) : (
                      <li>No items available</li>
                    )}
                  </ul>
                </div>
              )}
              <div className="button-row">
                <button onClick={() => toggleShowMore(index)}>
                  {expandedReceiptIndex === index ? 'Show less' : 'Show more'}
                </button>
                <button onClick={() => handleEditClick(receipt)}>Edit</button>
                <button onClick={() => onDelete(receipt.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="pagination">
        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
      </div>
    </div>
  );
}

export default ReceiptDisplay;
