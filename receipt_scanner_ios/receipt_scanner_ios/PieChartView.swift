//
//  PieChartView.swift
//  receipt_scanner_ios
//
//  Created by Lizy on 12/5/24.
//

import SwiftUI
import Charts
import DGCharts

struct PieChartView: UIViewRepresentable {
    var entries: [PieChartDataEntry]

    func makeUIView(context: Context) -> some UIView {
        let pieChart = DGCharts.PieChartView()
        pieChart.delegate = context.coordinator
        return pieChart
    }

    func updateUIView(_ uiView: UIViewType, context: Context) {
        guard let pieChart = uiView as? DGCharts.PieChartView else { return }
        
        let totalValue = entries.reduce(0) { $0 + $1.value }
        
        // Filter entries with percentage >= 5%
        let filteredEntries = entries.filter { ($0.value / totalValue) * 100 >= 5 }
        
        let dataSet = PieChartDataSet(entries: filteredEntries, label: "")
        dataSet.colors = ChartColorTemplates.vordiplom()
        dataSet.valueTextColor = .black
        dataSet.valueFont = .systemFont(ofSize: 14)
        dataSet.xValuePosition = .insideSlice
        dataSet.yValuePosition = .insideSlice
        dataSet.valueFormatter = CustomValueFormatter(totalValue: totalValue, formatter: percentageFormatter(totalValue: totalValue))
        
        let data = PieChartData(dataSet: dataSet)
        pieChart.data = data
        pieChart.usePercentValuesEnabled = true
        pieChart.notifyDataSetChanged()
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, ChartViewDelegate {
        var parent: PieChartView
        var currentLabel: UILabel? // Keep a reference to the current label

        init(_ parent: PieChartView) {
            self.parent = parent
        }

        func chartValueSelected(_ chartView: ChartViewBase, entry: ChartDataEntry, highlight: Highlight) {
            if let pieEntry = entry as? PieChartDataEntry, let pieChartView = chartView as? DGCharts.PieChartView {
                // Remove the previous label if it exists
                currentLabel?.removeFromSuperview()

                // Create a new UILabel to display the value
                let label = UILabel()
                label.text = String(format: "$%.2f", pieEntry.value)
                label.textColor = .black
                label.backgroundColor = UIColor(white: 0.9, alpha: 0.7) // Lighter color between white and light gray
                label.textAlignment = .center // Center the text within the label
                label.layer.cornerRadius = 8
                label.layer.masksToBounds = true
                label.sizeToFit()
                label.frame = label.frame.insetBy(dx: -8, dy: -4) // Add padding

                // Position the label exactly where the pie chart is clicked
                let xOffset = highlight.xPx - pieChartView.bounds.origin.x
                let yOffset = highlight.yPx - pieChartView.bounds.origin.y
                label.center = CGPoint(x: xOffset, y: yOffset)

                // Add the label to the chart view
                pieChartView.addSubview(label)

                // Update the current label reference
                currentLabel = label

                pieChartView.notifyDataSetChanged()
            }
        }

        func chartValueNothingSelected(_ chartView: ChartViewBase) {
            // Remove the current label if it exists
            currentLabel?.removeFromSuperview()
        }
    }

    private func percentageFormatter(totalValue: Double) -> NumberFormatter {
        let formatter = NumberFormatter()
        formatter.numberStyle = .percent
        formatter.maximumFractionDigits = 2
        formatter.multiplier = 1.0 // Set to 1.0 because we are manually calculating percentage

        return formatter
    }

    // Custom ValueFormatter class
    class CustomValueFormatter: NSObject, ValueFormatter {
        private let totalValue: Double
        private let formatter: NumberFormatter

        init(totalValue: Double, formatter: NumberFormatter) {
            self.totalValue = totalValue
            self.formatter = formatter
        }

        func stringForValue(_ value: Double, entry: ChartDataEntry, dataSetIndex: Int, viewPortHandler: ViewPortHandler?) -> String {
            // Calculate the percentage using the entry's value
            let percentage = (value / 100) * 100
            
            // If the percentage is lower than 5%, return an empty string
            if percentage < 5 {
                return ""
            }
            
            // Format the percentage as a string
            return formatter.string(from: NSNumber(value: percentage)) ?? ""
        }
    }
}

// New SwiftUI View to display the name:percentage
struct PieChartWithLabelsView: View {
    var entries: [PieChartDataEntry]

    var body: some View {
        VStack {
            PieChartView(entries: entries)
                .frame(height: 300) // Adjust the height as needed
        }
    }
}

