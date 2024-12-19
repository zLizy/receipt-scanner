import SwiftUI

// Define a new view for displaying records
struct RecordsView: View {
    @Binding var receiptData: [ReceiptData]
    @State private var expandedReceiptIndex: Int? = nil
    @State private var receiptToEdit: ReceiptData? = nil
    @State private var isEditViewPresented = false
    @State private var sortOption: SortOption = .dateDescending
    
    // Add a closure property for editing receipts
    var onEditReceipt: (ReceiptData) -> Void

    enum SortOption {
        case dateAscending, dateDescending, totalAscending, totalDescending
    }

    var body: some View {
        VStack {
            Text("Records")
                .font(.largeTitle)
                .padding()
            
            Picker("Sort by", selection: $sortOption) {
                Text("Date Descending").tag(SortOption.dateDescending)
                Text("Date Ascending").tag(SortOption.dateAscending)
                Text("Total Descending").tag(SortOption.totalDescending)
                Text("Total Ascending").tag(SortOption.totalAscending)
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding()

            List(sortedReceipts.indices, id: \.self) { index in
                let receipt = sortedReceipts[index]
                VStack(alignment: .leading) {
                    Text("Date: \(String(receipt.date.prefix(10)))")
                    Text("Place: \(receipt.place)")
                    Text("Category: \(receipt.category)")
                    Text("Total: \(String(format: "%.2f", receipt.total))")
                    
                    if expandedReceiptIndex == index {
                        // Show more details
                        ForEach(receipt.items, id: \.name) { item in
                            Text("Item: \(item.name)")
                            Text("Price: \(String(format: "%.2f", item.price))")
                            Text("Quantity: \(String(format: "%.2f", item.quantity))")
                            Text("Subcategory: \(item.subcategory)")
                        }
                    }
                    
                    HStack {
                        Button(action: { toggleShowMore(index: index) }) {
                            Text(expandedReceiptIndex == index ? "Show less" : "Show more")
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        Button(action: { 
                            // Use the closure to edit the receipt
                            onEditReceipt(receipt)
                        }) {
                            Text("Edit")
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        Button(action: { 
                            // Call the deleteReceipt function with the receipt's id
                            deleteReceipt(receipt.id) 
                        }) {
                            Text("Delete")
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding()
            }
        }
    }
    
    private var sortedReceipts: [ReceiptData] {
        switch sortOption {
        case .dateAscending:
            return receiptData.sorted { $0.date < $1.date }
        case .dateDescending:
            return receiptData.sorted { $0.date > $1.date }
        case .totalAscending:
            return receiptData.sorted { $0.total < $1.total }
        case .totalDescending:
            return receiptData.sorted { $0.total > $1.total }
        }
    }
    
    private func toggleShowMore(index: Int) {
        expandedReceiptIndex = (expandedReceiptIndex == index) ? nil : index
    }

    
    private func deleteReceipt(_ id: String) {
        // Remove the receipt with the given id from the receiptData array
        receiptData.removeAll { $0.id == id }
        
        // Make a network request to delete the receipt from the database
        guard let token = UserDefaults.standard.string(forKey: "authToken") else {
            print("No auth token found")
            return
        }
        
        let url = deleteReceiptUrl(id)
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Error deleting receipt: \(error)")
                return
            }
            
            print("Receipt deleted successfully from the database")
        }.resume()
    }
}