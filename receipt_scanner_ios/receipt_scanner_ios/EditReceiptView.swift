import SwiftUI

struct EditReceiptView: View {
    @Binding var receipt: ReceiptData
    var onSave: (ReceiptData) -> Void

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Date")) {
                    TextField("Date", text: $receipt.date)
                        // .foregroundColor(.gray)
                }
                
                Section(header: Text("Place")) {
                    TextField("Place", text: $receipt.place)
                        // .foregroundColor(.gray)
                }

                Section(header: Text("Category")) {
                    TextField("Category", text: $receipt.category)
                        // .foregroundColor(.gray)
                }
                
                Section(header: Text("Total")) {
                    TextField("Total", value: $receipt.total, formatter: NumberFormatter())
                        // .foregroundColor(.gray)
                }
                
                ForEach(receipt.items.indices, id: \.self) { index in
                    Section(header: Text("Item \(index + 1): Name - Price - Quantity - Subcategory")) {
                        TextField("Name", text: $receipt.items[index].name)
                            // .foregroundColor(.gray)
                        
                        TextField("Price", value: $receipt.items[index].price, formatter: NumberFormatter())
                            // .foregroundColor(.gray)
                        
                        TextField("Quantity", value: $receipt.items[index].quantity, formatter: NumberFormatter())
                            // .foregroundColor(.gray)
                        
                        TextField("Subcategory", text: $receipt.items[index].subcategory)
                            // .foregroundColor(.gray)
                    }
                }
            }
            .navigationBarTitle("Edit Receipt", displayMode: .inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        onSave(receipt)
                    }) {
                        Label("Save", systemImage: "checkmark.circle")
                    }
                }
            }
        }
    }
}

