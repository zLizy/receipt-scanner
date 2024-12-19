import SwiftUI

struct AddReceiptView: View {
    @State private var date: String = ""
    @State private var place: String = ""
    @State private var category: String = ""
    @State private var total: String = ""
    @State private var items: [ReceiptItem] = []
    @State private var newItemName: String = ""
    @State private var newItemPrice: String = ""
    @State private var newItemQuantity: String = ""
    @State private var newItemSubcategory: String = ""
    @State private var showItems: Bool = false
    var onSave: (ReceiptData) -> Void
    var user_id: String

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Receipt Details")) {
                    TextField("Date", text: $date)
                    TextField("Place", text: $place)
                    TextField("Category", text: $category)
                    TextField("Total", text: $total)
                        .keyboardType(.decimalPad)
                }
                
                Section(header: Text("Items")) {
                    if showItems {
                        ForEach(items.indices, id: \.self) { index in
                            VStack(alignment: .leading) {
                                Text("Item: \(items[index].name)")
                                Text("Price: \(items[index].formattedPrice)")
                                Text("Quantity: \(items[index].formattedQuantity)")
                                Text("Subcategory: \(items[index].subcategory)")
                            }
                        }
                    }
                    
                    VStack {
                        TextField("Item Name", text: $newItemName)
                        TextField("Price", text: $newItemPrice)
                            .keyboardType(.decimalPad)
                        TextField("Quantity", text: $newItemQuantity)
                            .keyboardType(.decimalPad)
                        TextField("Subcategory", text: $newItemSubcategory)
                        
                        Button(action: {
                            addItem()
                            showItems = true
                        }) {
                            Text("Add Item")
                                .font(.headline)
                                .padding()
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                        }
                    }
                }
            }
            .navigationBarTitle("Add New Receipt", displayMode: .inline)
            .navigationBarItems(trailing: Button("Save") {
                // Convert total to Double
                let totalValue = Double(total) ?? 0.0
                // Create a new ReceiptData object
                let newReceipt = ReceiptData(
                    user_id: user_id,
                    date: date,
                    items: items,
                    total: totalValue,
                    place: place,
                    category: category,
                    image_data: nil
                )
                // Call the function to save the new receipt to the database
                saveReceiptToDatabase(receipt: newReceipt)
            })
        }
    }
    
    private func addItem() {
        // Convert price and quantity to Double
        let priceValue = Double(newItemPrice) ?? 0.0
        let quantityValue = Double(newItemQuantity) ?? 0.0
        
        // Create a new ReceiptItem
        let newItem = ReceiptItem(name: newItemName, price: priceValue, quantity: quantityValue, subcategory: newItemSubcategory)
        
        // Add the new item to the items array
        items.append(newItem)
        
        // Clear the input fields
        newItemName = ""
        newItemPrice = ""
        newItemQuantity = ""
        newItemSubcategory = ""
    }
    
    private func saveReceiptToDatabase(receipt: ReceiptData) {
        // Check for auth token
        guard let token = UserDefaults.standard.string(forKey: "authToken") else {
            print("No auth token found")
            return
        }
        
        let url = URL(string: "\(apiBaseUrl)/api/add-receipt")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            let jsonData = try JSONEncoder().encode(receipt)
            request.httpBody = jsonData
        } catch {
            print("Error encoding receipt data: \(error)")
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Error adding receipt: \(error)")
                return
            }
            
            // Check the response status code
            if let httpResponse = response as? HTTPURLResponse {
                print("HTTP Response Status Code: \(httpResponse.statusCode)")
            }
            
            // Optionally, check the response data
            if let data = data, let responseString = String(data: data, encoding: .utf8) {
                print("Response Data: \(responseString)")
            }
            
            print("Receipt added successfully to the database")
            
            // Call the onSave closure to update the UI
            DispatchQueue.main.async {
                onSave(receipt)
            }
        }.resume()
    }
}