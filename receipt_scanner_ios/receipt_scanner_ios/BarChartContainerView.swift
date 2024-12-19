import SwiftUI
import DGCharts

enum TimePeriod: String, CaseIterable, Identifiable {
    case last30Days = "Last 30 Days"
    case last3Months = "Last 3 Months"
    case last6Months = "Last 6 Months"
    case last12Months = "Last 12 Months"

    var id: String { self.rawValue }

    var startDate: Date {
        let calendar = Calendar.current
        switch self {
        case .last30Days:
            return calendar.date(byAdding: .day, value: -30, to: Date())!
        case .last3Months:
            return calendar.date(byAdding: .month, value: -3, to: Date())!
        case .last6Months:
            return calendar.date(byAdding: .month, value: -6, to: Date())!
        case .last12Months:
            return calendar.date(byAdding: .year, value: -1, to: Date())!
        }
    }
}

struct BarChartContainerView: View {
    @Binding var timePeriod: TimePeriod
    @State private var filteredEntries: [BarChartDataEntry] = []
    var entries: [BarChartDataEntry]

    var body: some View {
        VStack {
            BarChartView(entries: filteredEntries, timePeriod: timePeriod)
                .frame(height: 300)
                .onAppear {
                    filterEntries()
                }
        }
        .onAppear {
            filterEntries()
        }
        .onChange(of: timePeriod) { _ in
            filterEntries()
            print("Time period changed to: \(timePeriod)")
        }
    }

    private func filterEntries() {
        let startDate = timePeriod.startDate
        print("Filtering entries from start date: \(startDate), time period: \(timePeriod)")
        
        filteredEntries = entries.filter { entry in
            let date = Date(timeIntervalSince1970: entry.x)
            return date >= startDate
        }
    }
}
