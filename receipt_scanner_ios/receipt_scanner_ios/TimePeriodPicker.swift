import SwiftUI

struct TimePeriodPicker: View {
    @Binding var selectedTimePeriod: TimePeriod

    var body: some View {
        Picker("Time Period", selection: $selectedTimePeriod) {
            Text("Last 30 Days").tag(TimePeriod.last30Days)
            Text("Last 3 Months").tag(TimePeriod.last3Months)
            Text("Last 6 Months").tag(TimePeriod.last6Months)
            Text("Last 12 Months").tag(TimePeriod.last12Months)
        }
        .pickerStyle(SegmentedPickerStyle())
    }
}