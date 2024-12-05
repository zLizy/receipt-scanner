const updateReceiptInDB = async (id, updatedData) => {
  // Example for a MongoDB setup
  return await Receipt.findByIdAndUpdate(id, updatedData, { new: true });
};

module.exports = { updateReceiptInDB };
