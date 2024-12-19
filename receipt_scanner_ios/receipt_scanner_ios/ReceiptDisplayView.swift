//
//  ReceiptDisplayView.swift
//  receipt-scanner
//
//  Created by Lizy on 12/1/24.
//

import Foundation
import SwiftUI

struct ReceiptDisplayView: View {
    let data: ReceiptData
    
    let formatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter
    }()
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Receipt Details")
                .font(.headline)
            
            Text("ID: \(data.id)")
            Text("User ID: \(data.user_id)")
            Text("Place: \(data.place)")
            Text("Total: \(formatter.string(from: NSNumber(value: data.total)) ?? "0.00")")
            Text("Date: \(data.date)")
            Text("Category: \(data.category)")
            
            ForEach(data.items, id: \.name) { item in
                VStack(alignment: .leading) {
                    Text("Item: \(item.name)")
                    Text("Price: \(formatter.string(from: NSNumber(value: item.price)) ?? "0.00")")
                    Text("Quantity: \(formatter.string(from: NSNumber(value: item.quantity)) ?? "0.00")")
                    Text("Subcategory: \(item.subcategory)")
                }
            }
            
            // Display image if available
            if let imageData = data.image_data, let uiImage = UIImage(data: imageData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFit()
                    .frame(height: 200)
            }
        }
        .padding()
    }
}

struct ReceiptDisplayView_Previews: PreviewProvider {
    static var previews: some View {
        // Create a sample instance of ReceiptData
        let sampleData = ReceiptData(
            id: "1",
            user_id: "123",
            date: "2024-12-01",
            items: [
                ReceiptItem(name: "Item 1", price: 10.0, quantity: 2, subcategory: "Subcategory A"),
                ReceiptItem(name: "Item 2", price: 5.0, quantity: 1, subcategory: "Subcategory B")
            ],
            total: 25.0,
            place: "Sample Place",
            category: "Sample Category",
            image_data: nil // or provide some sample image data
        )
        
        // Use the sample instance in the preview
        ReceiptDisplayView(data: sampleData)
    }
}
