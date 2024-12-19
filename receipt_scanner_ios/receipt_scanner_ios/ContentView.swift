import SwiftUI
//import Charts
import DGCharts
import UIKit

// Retrieve the API base URL from the environment variables
let apiBaseUrl =  "http://localhost:5001"
// let apiBaseUrl = "http://192.168.1.82:5001" ?? "http://localhost:5001" //https://145.94.174.153:5001


// Update your URL strings to use the apiBaseUrl
let receiptDataUrl = URL(string: "\(apiBaseUrl)/api/receipts-data")!
let scanReceiptUrl = URL(string: "\(apiBaseUrl)/api/scan-receipt")!
let userProfileUrl = URL(string: "\(apiBaseUrl)/api/user-profile")!
let updateReceiptUrl = { (id: String) in URL(string: "\(apiBaseUrl)/api/update-receipts/\(id)")! }
let deleteReceiptUrl = { (id: String) in URL(string: "\(apiBaseUrl)/api/delete-receipts/\(id)")! }

struct CameraView: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    var onImagePicked: (UIImage) -> Void

    class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        var parent: CameraView

        init(parent: CameraView) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let uiImage = info[.originalImage] as? UIImage {
                parent.onImagePicked(uiImage)
            }
            picker.dismiss(animated: true)
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            picker.dismiss(animated: true)
        }
    }

    func makeCoordinator() -> Coordinator {
        return Coordinator(parent: self)
    }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        
        // Check if the camera is available
        if UIImagePickerController.isSourceTypeAvailable(.camera) {
            picker.sourceType = .camera
        } else {
            // Handle the case where the camera is not available
            print("Camera not available")
            // Optionally, you can present an alert to the user here
        }
        
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
}



struct ContentView: View {
    @EnvironmentObject var userSettings: UserSettings
    @State private var isAuthenticated = false
    @State private var receiptData: [ReceiptData] = []
    @State private var showImagePicker = false
    @State private var selectedImage: UIImage? = nil
    @State private var isLoading = false
    @State private var chartType: String = "pie"
    @State private var expandedReceiptIndex: Int? = nil
    @State private var currentPage: Int = 1
    private let receiptsPerPage = 30
    @State private var isEditViewPresented = false
    @State private var receiptToEdit: ReceiptData? = nil
    @State private var successMessage: String? = nil
    @State private var isProcessingImage = false
    @State private var isFinished = false
    @State private var processingMessage: String? = nil
    @State private var selectedCategory: String = "all"
    @State private var view: String = "category"
    @State private var selectedTimeRange: TimePeriod = .last30Days
    @State private var entries: [BarChartDataEntry] = []
    @State private var showCamera = false
    @State private var errorMessage: String? = nil
    @State private var username: String = ""
    @State private var email: String = ""
    @State private var showRecordsSheet = false
    @State private var showLanguageCountrySelection = false
    @State private var isAddReceiptViewPresented = false
    @State private var user_id: String = ""
    @State private var isNewReceiptAdded = false

    var body: some View {
        if isAuthenticated {
            TabView {
                // Records Tab
                VStack {
                    // Add Upload Image Button
                    GeometryReader { geometry in
                        let buttonWidth = geometry.size.width * 0.8 // Adjust the multiplier as needed

                        VStack {
                            Button(action: {
                                showImagePicker = true
                            }) {
                                HStack {
                                    Image(systemName: "photo.on.rectangle")
                                    Text("Upload Image")
                                        .font(.headline)
                                }
                                .frame(width: buttonWidth)
                                .padding()
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                            }
                            .padding()

                            Button(action: {
                                showCamera = true
                            }) {
                                HStack {
                                    Image(systemName: "camera")
                                    Text("Scan with Camera")
                                        .font(.headline)
                                }
                                .frame(width: buttonWidth)
                                .padding()
                                .background(Color.green)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                            }
                            .padding()
                            
                            // New Button
                            Button(action: {
                                isAddReceiptViewPresented = true
                            }) {
                                HStack {
                                    Image(systemName: "pencil")
                                    Text("Add New Receipt")
                                        .font(.headline)
                                }
                                .frame(width: buttonWidth)
                                .padding()
                                .background(Color.orange)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                            }
                            .padding()
                        }
                    }
                    
                    // Display success message
                    if let message = successMessage {
                        Text(message)
                            .foregroundColor(.green)
                            .padding()
                    }
                    
                    if isProcessingImage {
                        Text(processingMessage ?? "Processing image...")
                            .foregroundColor(.orange)
                            .padding()
                        // Optionally, add an activity indicator or animation here
                    } else if let error = errorMessage {
                        Text(error)
                            .foregroundColor(.red)
                            .padding()
                        Button(action: {
                            // Reset error message and retry logic
                            errorMessage = nil
                            showImagePicker = true // or any other retry logic
                        }) {
                            Text("Fail, please try again")
                                .font(.headline)
                                .padding()
                                .background(Color.red)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                        }
                        .padding()
                    }
                    if isFinished {
                        // Display the most recent receipt
                        if let latestReceipt = receiptData.first {
                            RecordsView(receiptData: .constant([latestReceipt]), onEditReceipt: editReceipt)
                        }
                    }
                }
                .tabItem {
                    Image(systemName: "doc")
                    Text("Scan")
                }
                
                // Charts Tab
                VStack {
                    Text("Charts")
                        .font(.largeTitle)
                        .padding()
                    
                    Picker("Chart Type", selection: $chartType) {
                        Text("Pie").tag("pie")
                        Text("Bar").tag("bar")
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding()
                    
                    if chartType == "pie" {
                        Picker("View", selection: $view) {
                            Text("Category").tag("category")
                            Text("Subcategory").tag("subcategory")
                        }
                        .pickerStyle(SegmentedPickerStyle())
                        .padding()
                        
                        if view == "subcategory" {
                            Picker("Select Category", selection: $selectedCategory) {
                                Text("All").tag("all")
                                ForEach(getMainCategories(), id: \.self) { category in
                                    Text(category).tag(category)
                                }
                            }
                            .pickerStyle(MenuPickerStyle())
                            .padding()
                        }
                        
                        PieChartWithLabelsView(entries: getPieChartData(from: receiptData))
                            .frame(height: 300)
                    } else if chartType == "bar" {
                        Picker("Time Range", selection: $selectedTimeRange) {
                            Text("Last 30 Days").tag(TimePeriod.last30Days)
                            Text("Last 3 Months").tag(TimePeriod.last3Months)
                            Text("Last 6 Months").tag(TimePeriod.last6Months)
                            Text("Last 12 Months").tag(TimePeriod.last12Months)
                        }
                        .pickerStyle(MenuPickerStyle())
                        .padding()
                        
                        BarChartContainerView(timePeriod: $selectedTimeRange, entries: entries)
                            .frame(height: 300)
                            .onChange(of: selectedTimeRange) { _ in
                                updateBarChartEntries()
                            }
                    }
                }
                .tabItem {
                    Image(systemName: "chart.pie")
                    Text("Statistics")
                }
                
                // Account Tab
                VStack {
                    Text("Account")
                        .font(.largeTitle)
                        .padding()
                    
                    // User profile section
                    HStack {
                        Image(systemName: "person.crop.circle")
                            .resizable()
                            .frame(width: 60, height: 60)
                            .padding()
                        
                        VStack(alignment: .leading) {
                            Text("User: \(username)")
                                .font(.headline)
                            Text("Email: \(email)")
                                .font(.subheadline)
                        }
                        Spacer()
                    }
                    .background(RoundedRectangle(cornerRadius: 10).fill(Color.gray.opacity(0.1)))
                    .padding(.horizontal)
                    
                    // Options section
                    VStack(spacing: 10) {
                        Button(action: {
                            showRecords()
                        }) {
                            AccountOptionView(icon: "document", title: "Records")
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // AccountOptionView(icon: "photo", title: "Moments")
                        // AccountOptionView(icon: "tag", title: "Cards & Offers")
                        // AccountOptionView(icon: "smiley", title: "Sticker Gallery")
                        Button(action: {
                            showLanguageCountrySelection = true
                        }) {
                            AccountOptionView(icon: "gear", title: "Settings")
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // Add Log Out Button
                        Button(action: {
                            isAuthenticated = false // Log out and go back to login page
                        }) {
                            Text("Log Out")
                                .font(.headline)
                                .padding()
                                .background(Color.red)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                        }
                        .padding(.top, 20)
                    }
                    .padding(.horizontal)
                }
                .tabItem {
                    Image(systemName: "person.circle")
                    Text("Account")
                }
            }
            .sheet(isPresented: $showImagePicker) {
                ImagePicker(image: $selectedImage, onImagePicked: handleImageUpload)
            }
            .sheet(isPresented: $isEditViewPresented) {
                if let receiptToEdit = receiptToEdit {
                    EditReceiptView(receipt: Binding(
                        get: { receiptToEdit },
                        set: { self.receiptToEdit = $0 }
                    ), onSave: { updatedReceipt in
                        updateReceiptInDatabase(receipt: updatedReceipt)
                        // Update the local receiptData array with the updated receipt
                        if let index = receiptData.firstIndex(where: { $0.id == updatedReceipt.id }) {
                            receiptData[index] = updatedReceipt
                        }
                        // Dismiss the edit view
                        isEditViewPresented = false
                    })
                }
            }
            .sheet(isPresented: $showCamera) {
                CameraView(image: $selectedImage, onImagePicked: handleImageUpload)
            }
            .sheet(isPresented: $showRecordsSheet) {
                RecordsView(receiptData: $receiptData, onEditReceipt: editReceipt)
            }
            .sheet(isPresented: $showLanguageCountrySelection) {
                LanguageCountrySelectionView()
            }
            .sheet(isPresented: $isAddReceiptViewPresented) {
                AddReceiptView(onSave: { newReceipt in
                    // Add the new receipt to the receiptData array
                    receiptData.insert(newReceipt, at: 0)
                    isAddReceiptViewPresented = false
                    isFinished = true // Set the flag to true
                }, user_id: user_id)
            }
            .onAppear {
                fetchReceiptData()
                fetchUserData()
            }
            
            
        } else {
            LoginView(isAuthenticated: $isAuthenticated)
        }
    }
    
    func fetchReceiptData() {
        guard let token = UserDefaults.standard.string(forKey: "authToken") else {
            print("No auth token found")
            return
        }
        
        let url = receiptDataUrl
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Error fetching receipt data: \(error)")
                return
            }
            
            guard let data = data else { return }
            
            do {
                let fetchedData = try JSONDecoder().decode([ReceiptData].self, from: data)
                DispatchQueue.main.async {
                    self.receiptData = fetchedData
                }
            } catch {
                print("Error decoding user data: \(error)")
            }
        }.resume()
    }
    
    func handleImageUpload(image: UIImage) {
        isProcessingImage = true
        processingMessage = "Processing image..."
        errorMessage = nil // Reset error message

        // Convert UIImage to Data
        guard let imageData = image.jpegData(compressionQuality: 1) else { return }
        
        // Retrieve the token
        guard let token = UserDefaults.standard.string(forKey: "authToken") else {
            print("No auth token found")
            return
        }
        
        // Create URLRequest
        var request = URLRequest(url: scanReceiptUrl)
        request.httpMethod = "POST"
        
        // Add authorization header
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        // Create multipart form data
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"receipt.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        
        // Add language and country to the request body
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"language\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(userSettings.selectedLanguage)\r\n".data(using: .utf8)!)
        
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"country\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(userSettings.selectedCountry)\r\n".data(using: .utf8)!)
        
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        // Perform the request
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                isProcessingImage = false
                isFinished = true
                processingMessage = nil
            }
            
            if let error = error {
                DispatchQueue.main.async {
                    errorMessage = "Error uploading image: \(error.localizedDescription). Please try again."
                }
                return
            }
            
            guard let data = data else { return }
            
            do {
                let receiptData = try JSONDecoder().decode(ReceiptData.self, from: data)
                DispatchQueue.main.async {
                    // Prepend the new receipt data
                    self.receiptData.insert(receiptData, at: 0)
                    self.refreshDisplayedData()
                    
                    // Set success message
                    self.successMessage = "Receipt successfully extracted and added to records."
                    
                    // Clear the message after a delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                        self.successMessage = nil
                    }
                }
            } catch {
                print("Error decoding receipt data: \(error)")
            }
        }.resume()
    }
    
    private func refreshDisplayedData() {
        currentPage = 1
    }
    
    func getCategories(from receiptData: [ReceiptData], useSubcategories: Bool = true) -> [String: Double] {
        var categoryTotals: [String: Double] = [:]
        
        for receipt in receiptData {
            if view == "category" {
                let categoryKey: String = receipt.category
                let total = receipt.total
                categoryTotals[categoryKey, default: 0.0] += total
            }
            else { //if view == "subcategory" 
                for item in receipt.items {
                    // Determine the key based on the view state
                    let categoryKey: String
                    categoryKey = item.subcategory
                    let total = item.price * Double(item.quantity)
                    categoryTotals[categoryKey, default: 0.0] += total
                }
            }
        }
        
        return categoryTotals
    }
    
    func getPieChartData(from receiptData: [ReceiptData]) -> [PieChartDataEntry] {
        let filteredData: [ReceiptData]
        
        if view == "category" {
            // Show all data for main categories
            filteredData = receiptData
        } else {
            // Filter data for categories based on the selected category
            filteredData = receiptData.filter { receipt in
                (selectedCategory == "all") || (receipt.category == selectedCategory)
            }
        }
        
        let categoryTotals = getCategories(from: filteredData, useSubcategories: view != "category")
        return categoryTotals.map { PieChartDataEntry(value: $0.value, label: $0.key) }
    }
    
    func getBarChartData(from receiptData: [ReceiptData], timeRange: TimePeriod) -> [BarChartDataEntry] {
        var entries: [BarChartDataEntry] = []
        
        // Group receipts by date
        let groupedByDate = Dictionary(grouping: receiptData) { receipt in
            return receipt.date
        }
        
        // Convert grouped data into BarChartDataEntry
        for (dateString, receipts) in groupedByDate {
            let total = receipts.reduce(0) { $0 + $1.total }
            
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            if let date = dateFormatter.date(from: String(dateString.prefix(10))) {
                let timeInterval = date.timeIntervalSince1970
                entries.append(BarChartDataEntry(x: timeInterval, y: total))
            } else {
                print("Error converting date: \(dateString)")
            }
        }
        
        // Sort entries by date
        entries.sort { $0.x < $1.x }
        
        return entries
    }
  
    
    
    private func changePage(by offset: Int) {
        currentPage += offset
    }
    
    func getMainCategories() -> [String] {
        // Extract unique main categories from receiptData
        return Array(Set(receiptData.map { $0.category }))
    }

    private func updateBarChartEntries() {
        entries = getBarChartData(from: receiptData, timeRange: selectedTimeRange)
    }

    func fetchUserData() {
        guard let token = UserDefaults.standard.string(forKey: "authToken") else {
            print("No auth token found")
            return
        }
        
        let url = userProfileUrl
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Error fetching user data: \(error)")
                return
            }
            
            guard let data = data else { return }
            
            do {
                let userProfile = try JSONDecoder().decode(UserProfile.self, from: data)
                DispatchQueue.main.async {
                    self.username = userProfile.username
                    self.email = userProfile.email ?? ""
                    self.user_id = userProfile.id
                }
            } catch {
                print("Error decoding user data: \(error)")
            }
        }.resume()
    }

    private func showRecords() {
        showRecordsSheet = true
    }

    private func updateReceiptInDatabase(receipt: ReceiptData) {
        // Check for auth token
        guard let token = UserDefaults.standard.string(forKey: "authToken") else {
            print("No auth token found")
            return
        }
        
        let receiptId = receipt.id
        let url = updateReceiptUrl(receiptId)
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
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
                print("Error updating receipt: \(error)")
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
            
            print("Receipt updated successfully in the database")
        }.resume()
    }

    private func editReceipt(receipt: ReceiptData) {
        receiptToEdit = receipt
        isEditViewPresented = true
    }
}

// Define a struct to match the expected JSON response
struct UserProfile: Codable {
    let id: String
    let username: String
    let email: String?
}



struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
