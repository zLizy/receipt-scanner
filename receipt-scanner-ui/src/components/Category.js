import React from 'react';

function Category({ category, total }) {
  return (
    <div className="category">
      <p><strong>Category:</strong> {category || 'N/A'}</p>
      <p><strong>Total:</strong> ${total ? parseFloat(total).toFixed(2) : '0.00'}</p>
    </div>
  );
}

export default Category;
