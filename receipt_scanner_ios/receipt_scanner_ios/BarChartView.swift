//
//  BarChartView.swift
//  receipt_scanner_ios
//
//  Created by Lizy on 12/5/24.
//

import SwiftUI
import Charts
import DGCharts

struct BarChartView: UIViewRepresentable {
    var entries: [BarChartDataEntry]
    var timePeriod: TimePeriod

    func makeUIView(context: Context) -> some UIView {
        print("Creating BarChartView with time period: \(timePeriod)")
        let barChart = DGCharts.BarChartView()
        
        // Configure xAxis to display dates
        let xAxis = barChart.xAxis
        let formatter = DateValueFormatter(timePeriod: timePeriod)
        print("Initialized formatter with format: \(formatter.getDateFormat())")
        xAxis.valueFormatter = formatter
        xAxis.labelPosition = .bottom
        xAxis.labelRotationAngle = -45
        xAxis.drawGridLinesEnabled = true
        xAxis.centerAxisLabelsEnabled = true  // Center labels between grid lines
    
        // Set fixed number of labels based on time period
        switch timePeriod {
        case .last30Days:
            xAxis.setLabelCount(10, force: true)  // Show label every 3 days (30/3 = 10)
            xAxis.granularity = 3
        case .last3Months:
            xAxis.setLabelCount(3, force: true)
            xAxis.granularity = 1
        case .last6Months:
            xAxis.setLabelCount(6, force: true)
            xAxis.granularity = 1
        case .last12Months:
            xAxis.setLabelCount(12, force: true)
            xAxis.granularity = 1
        }
        
          // For last30Days, show every 3rd day
        
        // Adjust axis spacing
        xAxis.spaceMin = 0.2
        xAxis.spaceMax = 0.2
        
        // Increase horizontal margin
        barChart.extraLeftOffset = 20
        barChart.extraRightOffset = 20
        
        // Add minimum offset to ensure labels are visible
        barChart.minOffset = 30
        
        // Configure yAxis
        let leftAxis = barChart.leftAxis
        leftAxis.axisMinimum = 0
        
        barChart.rightAxis.enabled = false
        
        // Configure legend
        barChart.legend.enabled = true
        barChart.legend.horizontalAlignment = .center
        
        return barChart
    }

    func updateUIView(_ uiView: UIViewType, context: Context) {
        guard let barChart = uiView as? DGCharts.BarChartView else { return }
        
        let calendar = Calendar.current
        let today = Date()
        var fixedEntries: [BarChartDataEntry] = []
        
        switch timePeriod {
        case .last30Days:
            let dayFormatter = DateFormatter()
            dayFormatter.dateFormat = "yyyy-MM-dd"
            
            // Aggregate values by day
            var entriesDict: [String: Double] = [:]
            for entry in entries {
                let date = Date(timeIntervalSince1970: entry.x)
                let key = dayFormatter.string(from: date)
                entriesDict[key, default: 0] += entry.y  // Sum up values for the same day
            }
            
            // Create entries for the last 30 days
            for i in 0..<30 {
                if let date = calendar.date(byAdding: .day, value: -(29 - i), to: today) {
                    let key = dayFormatter.string(from: date)
                    let value = entriesDict[key] ?? 0
                    fixedEntries.append(BarChartDataEntry(x: Double(i), y: value))
                }
            }
            
            barChart.xAxis.granularity = 3
            barChart.xAxis.axisMinimum = -0.5
            barChart.xAxis.axisMaximum = 29.5
            
        case .last3Months, .last6Months, .last12Months:
            let monthFormatter = DateFormatter()
            monthFormatter.dateFormat = "yyyy-MM"
            
            // Aggregate values by month
            var entriesDict: [String: Double] = [:]
            for entry in entries {
                let date = Date(timeIntervalSince1970: entry.x)
                let key = monthFormatter.string(from: date)
                entriesDict[key, default: 0] += entry.y  // Sum up values for the same month
            }
            
            let numberOfMonths: Int
            switch timePeriod {
            case .last3Months: numberOfMonths = 3
            case .last6Months: numberOfMonths = 6
            case .last12Months: numberOfMonths = 12
            default: numberOfMonths = 0
            }
            
            for i in 0..<numberOfMonths {
                if let date = calendar.date(byAdding: .month, value: -(numberOfMonths - 1 - i), to: today) {
                    let key = monthFormatter.string(from: date)
                    let value = entriesDict[key] ?? 0
                    fixedEntries.append(BarChartDataEntry(x: Double(i), y: value))
                }
            }
            
            barChart.xAxis.granularity = 1
            barChart.xAxis.axisMinimum = -0.5
            barChart.xAxis.axisMaximum = Double(numberOfMonths - 1) + 0.5
        }
        
        let dataSet = BarChartDataSet(entries: fixedEntries, label: "Total Spending")
        dataSet.colors = [UIColor.systemTeal]
        dataSet.valueColors = [.black]
        
        let data = BarChartData(dataSet: dataSet)
        data.setValueFont(.systemFont(ofSize: 12, weight: .bold))
        data.barWidth = 0.8
        
        barChart.data = data
        barChart.animate(xAxisDuration: 0.5, yAxisDuration: 0.5)
        
        // Uncomment this for debugging
        for entry in entries {
            print("Data point - x: \(entry.x), y: \(entry.y)")
        }
    }
}

class DateValueFormatter: AxisValueFormatter {
    private let dateFormatter: DateFormatter
    private var timePeriod: TimePeriod
    private var entries: [BarChartDataEntry]?

    init(timePeriod: TimePeriod) {
        self.timePeriod = timePeriod
        self.dateFormatter = DateFormatter()
        self.entries = nil
        self.updateDateFormat()
    }

    private func updateDateFormat() {
        // Configure date formatter based on time period
        switch timePeriod {
        case .last30Days:
            dateFormatter.dateFormat = "MMM-dd"
        case .last3Months:
            dateFormatter.dateFormat = "MMM,yy"
        case .last6Months, .last12Months:
            dateFormatter.dateFormat = "MMM,yy"  // Simplified to just show month name
        }
        // print("Set date format to: \(dateFormatter.dateFormat)")
    }

    func getDateFormat() -> String {
        return dateFormatter.dateFormat
    }

    func updateTimePeriod(_ newTimePeriod: TimePeriod) {
        self.timePeriod = newTimePeriod
        self.updateDateFormat()
    }

    func updateEntries(_ newEntries: [BarChartDataEntry]) {
        self.entries = newEntries
    }

    func stringForValue(_ value: Double, axis: AxisBase?) -> String {
        let calendar = Calendar.current
        let today = Date()
        
        switch timePeriod {
        case .last30Days:
            if let date = calendar.date(byAdding: .day, value: Int(value) - 29, to: today) {
                return dateFormatter.string(from: date)
            }
        case .last3Months, .last6Months, .last12Months:
            let numberOfMonths: Int
            switch timePeriod {
            case .last3Months: numberOfMonths = 3
            case .last6Months: numberOfMonths = 6
            case .last12Months: numberOfMonths = 12
            default: numberOfMonths = 0
            }
            
            if let date = calendar.date(byAdding: .month, value: Int(value) - (numberOfMonths - 1), to: today) {
                return dateFormatter.string(from: date)
            }
        }
        return ""
    }   
}

