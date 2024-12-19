import SwiftUI
struct LanguageCountrySelectionView: View {
    @EnvironmentObject var userSettings: UserSettings
    
    var body: some View {
        VStack {
            Text("Select Language and Country")
                .font(.largeTitle)
                .padding()
            
            // Language Selection
            HStack {
                TextField("Select Language", text: $userSettings.selectedLanguage)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .padding()
                
                Menu {
                    Button("English") { userSettings.selectedLanguage = "English" }
                    Button("Spanish") { userSettings.selectedLanguage = "Spanish" }
                    Button("French") { userSettings.selectedLanguage = "French" }
                    Button("German") { userSettings.selectedLanguage = "German" }
                    Button("Italian") { userSettings.selectedLanguage = "Italian" }
                    Button("Chinese") { userSettings.selectedLanguage = "Chinese" }
                    Button("Japanese") { userSettings.selectedLanguage = "Japanese" }
                    Button("Korean") { userSettings.selectedLanguage = "Korean" }
                    Button("Portuguese") { userSettings.selectedLanguage = "Portuguese" }
                    Button("Russian") { userSettings.selectedLanguage = "Russian" }
                    Button("Arabic") { userSettings.selectedLanguage = "Arabic" }
                    Button("Hindi") { userSettings.selectedLanguage = "Hindi" }
                    Button("Bengali") { userSettings.selectedLanguage = "Bengali" }
                    Button("Urdu") { userSettings.selectedLanguage = "Urdu" }
                    Button("Turkish") { userSettings.selectedLanguage = "Turkish" }
                    Button("Vietnamese") { userSettings.selectedLanguage = "Vietnamese" }
                    Button("Thai") { userSettings.selectedLanguage = "Thai" }
                    Button("Dutch") { userSettings.selectedLanguage = "Dutch" }
                    Button("Greek") { userSettings.selectedLanguage = "Greek" }
                    // Add more languages as needed
                } label: {
                    Image(systemName: "chevron.down.circle")
                        .padding()
                }
            }
            
            // Country Selection
            HStack {
                TextField("Select Country", text: $userSettings.selectedCountry)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .padding()
                
                Menu {
                    Button("United States") { userSettings.selectedCountry = "United States" }
                    Button("Canada") { userSettings.selectedCountry = "Canada" }
                    Button("United Kingdom") { userSettings.selectedCountry = "United Kingdom" }
                    Button("Australia") { userSettings.selectedCountry = "Australia" }
                    Button("India") { userSettings.selectedCountry = "India" }
                    Button("Germany") { userSettings.selectedCountry = "Germany" }
                    Button("France") { userSettings.selectedCountry = "France" }
                    Button("Japan") { userSettings.selectedCountry = "Japan" }
                    Button("China") { userSettings.selectedCountry = "China" }
                    Button("Brazil") { userSettings.selectedCountry = "Brazil" }
                    Button("South Africa") { userSettings.selectedCountry = "South Africa" }
                    Button("Netherlands") { userSettings.selectedCountry = "Netherlands" }
                    // Add more countries as needed
                } label: {
                    Image(systemName: "chevron.down.circle")
                        .padding()
                }
            }
            
            Spacer()
        }
        .padding()
    }
}