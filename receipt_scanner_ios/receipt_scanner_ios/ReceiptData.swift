//
//  ReceiptData.swift
//  receipt-scanner
//
//  Created by Lizy on 12/5/24.
//

import Foundation

struct ReceiptData: Codable {

    var id: String
    var user_id: String
    var date: String
    var items: [ReceiptItem]
    var total: Double
    var place: String
    var category: String
    var image_data: Data?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case user_id
        case date
        case items
        case total
        case place
        case category
        case image_data
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Decode other properties
        id = try container.decode(String.self, forKey: .id)
        user_id = try container.decode(String.self, forKey: .user_id)
        date = try container.decode(String.self, forKey: .date)
        items = try container.decode([ReceiptItem].self, forKey: .items)
        place = try container.decode(String.self, forKey: .place)
        category = try container.decode(String.self, forKey: .category)
        // image_data = try? container.decode(Data.self, forKey: .image_data)

        // Attempt to decode total as a Double, or as a String and convert to Double
        if let totalValue = try? container.decode(Double.self, forKey: .total) {
            total = totalValue
        } else if let totalString = try? container.decode(String.self, forKey: .total),
                  let totalValue = Double(totalString) {
            total = totalValue
        } else {
            throw DecodingError.dataCorruptedError(forKey: .total, in: container, debugDescription: "Total value is not a valid Double or String")
        }
    }

    init(id: String="", user_id: String="", date: String="", items: [ReceiptItem]=[], total: Double=0.0, place: String="", category: String="", image_data: Data? = nil) {
        self.id = id
        self.user_id = user_id
        self.date = date
        self.items = items
        self.total = total
        self.place = place
        self.category = category
        self.image_data = image_data
    }

    // Computed property to format total to two decimal places
    var formattedTotal: String {
        return String(format: "%.2f", total)
    }
}

struct ReceiptItem: Codable {
    var name: String
    var price: Double
    var quantity: Double
    var subcategory: String

    // Computed properties to format price and quantity to two decimal places
    var formattedPrice: String {
        return String(format: "%.2f", price)
    }

    var formattedQuantity: String {
        return String(format: "%.2f", quantity)
    }
}

struct Category {
    var name: String
    var total: Double
}
