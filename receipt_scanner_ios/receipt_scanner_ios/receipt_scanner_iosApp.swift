//
//  receipt_scanner_iosApp.swift
//  receipt_scanner_ios
//
//  Created by Lizy on 12/5/24.
//

import SwiftUI

// Create a shared settings class
class UserSettings: ObservableObject {
    @Published var selectedLanguage: String {
        didSet {
            UserDefaults.standard.set(selectedLanguage, forKey: "selectedLanguage")
        }
    }
    
    @Published var selectedCountry: String {
        didSet {
            UserDefaults.standard.set(selectedCountry, forKey: "selectedCountry")
        }
    }
    
    init() {
        self.selectedLanguage = UserDefaults.standard.string(forKey: "selectedLanguage") ?? "English"
        self.selectedCountry = UserDefaults.standard.string(forKey: "selectedCountry") ?? "United States"
    }
}


@main
struct receipt_scanner_iosApp: App {
    // Create an instance of UserSettings
    @StateObject private var userSettings = UserSettings()

    var body: some Scene {
        WindowGroup {
            ContentView()
            .environmentObject(userSettings)
        }
    }
}
