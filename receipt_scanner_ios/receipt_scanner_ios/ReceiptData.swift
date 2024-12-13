//
//  Receipt.swift
//  receipt_scanner_ios
//
//  Created by Lizy on 12/5/24.
//

import Foundation

struct Receipt: Identifiable {
    let id: UUID
    let date: String
    let category: String
    let place: String
    let total: Double
    let items: [ReceiptItem]
}

struct ReceiptItem {
    let name: String
    let price: Double
    let quantity: Int
}