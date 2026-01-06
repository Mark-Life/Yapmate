import UIKit
import Down

// MARK: - Table Data

struct TableData {
  let headers: [String]
  let rows: [[String]]
}

// MARK: - Table Parser

/**
 * Parses a markdown table string into structured TableData.
 * Expected format:
 * | Header 1 | Header 2 |
 * |----------|----------|
 * | Cell 1   | Cell 2   |
 */
func parseMarkdownTable(_ markdown: String) -> TableData? {
  let lines = markdown.components(separatedBy: "\n")
    .map { $0.trimmingCharacters(in: .whitespaces) }
    .filter { !$0.isEmpty }
  
  guard lines.count >= 2 else { return nil }
  
  // Parse header row
  let headerLine = lines[0]
  let headers = parseTableRow(headerLine)
  guard !headers.isEmpty else { return nil }
  
  // Skip separator line (line with dashes)
  // Find first non-separator line after header
  var dataStartIndex = 1
  for i in 1..<lines.count {
    let line = lines[i]
    // Check if this is a separator line (contains mostly dashes and pipes)
    let stripped = line.replacingOccurrences(of: "|", with: "")
      .replacingOccurrences(of: "-", with: "")
      .replacingOccurrences(of: ":", with: "")
      .trimmingCharacters(in: .whitespaces)
    if stripped.isEmpty {
      dataStartIndex = i + 1
      break
    }
  }
  
  // Parse data rows
  var rows: [[String]] = []
  for i in dataStartIndex..<lines.count {
    let row = parseTableRow(lines[i])
    if !row.isEmpty {
      // Pad row to match header count if needed
      var paddedRow = row
      while paddedRow.count < headers.count {
        paddedRow.append("")
      }
      rows.append(paddedRow)
    }
  }
  
  return TableData(headers: headers, rows: rows)
}

/**
 * Parses a single table row into cells.
 */
private func parseTableRow(_ line: String) -> [String] {
  var cells: [String] = []
  
  // Remove leading/trailing pipes and split
  var trimmed = line
  if trimmed.hasPrefix("|") {
    trimmed = String(trimmed.dropFirst())
  }
  if trimmed.hasSuffix("|") {
    trimmed = String(trimmed.dropLast())
  }
  
  let parts = trimmed.components(separatedBy: "|")
  for part in parts {
    cells.append(part.trimmingCharacters(in: .whitespaces))
  }
  
  return cells
}

// MARK: - Table Styler Configuration

private func createTableStylerConfiguration(isHeader: Bool) -> DownStylerConfiguration {
  var fonts = StaticFontCollection()
  
  let weight: UIFont.Weight = isHeader ? .semibold : .regular
  fonts.body = UIFont.systemFont(ofSize: 13, weight: weight)
  fonts.heading1 = UIFont.systemFont(ofSize: 13, weight: .bold)
  fonts.heading2 = UIFont.systemFont(ofSize: 13, weight: .bold)
  fonts.heading3 = UIFont.systemFont(ofSize: 13, weight: .semibold)
  fonts.code = UIFont.monospacedSystemFont(ofSize: 12, weight: .regular)
  
  var colors = StaticColorCollection()
  colors.body = .markdownText
  colors.heading1 = .markdownText
  colors.heading2 = .markdownText
  colors.heading3 = .markdownText
  colors.code = .markdownText
  colors.link = .markdownLink
  
  var paragraphStyles = StaticParagraphStyleCollection()
  let bodyStyle = NSMutableParagraphStyle()
  bodyStyle.lineSpacing = 2
  paragraphStyles.body = bodyStyle
  
  var config = DownStylerConfiguration()
  config.fonts = fonts
  config.colors = colors
  config.paragraphStyles = paragraphStyles
  
  return config
}

// MARK: - Table Cell View

private class TableCellView: UIView {
  
  private let textView = UITextView()
  private let styler: DownStyler
  private let customTextColor: UIColor?
  
  init(markdown: String, isHeader: Bool, textColor: UIColor?) {
    self.customTextColor = textColor
    self.styler = DownStyler(configuration: createTableStylerConfiguration(isHeader: isHeader))
    super.init(frame: .zero)
    setupView()
    setMarkdown(markdown, isHeader: isHeader)
  }
  
  required init?(coder: NSCoder) {
    fatalError("init(coder:) not implemented")
  }
  
  private func setupView() {
    textView.isEditable = false
    textView.isScrollEnabled = false
    textView.isSelectable = false
    textView.backgroundColor = .clear
    textView.textContainerInset = UIEdgeInsets(top: 8, left: 8, bottom: 8, right: 8)
    textView.textContainer.lineFragmentPadding = 0
    textView.translatesAutoresizingMaskIntoConstraints = false
    
    addSubview(textView)
    
    NSLayoutConstraint.activate([
      textView.topAnchor.constraint(equalTo: topAnchor),
      textView.leadingAnchor.constraint(equalTo: leadingAnchor),
      textView.trailingAnchor.constraint(equalTo: trailingAnchor),
      textView.bottomAnchor.constraint(equalTo: bottomAnchor)
    ])
  }
  
  private func setMarkdown(_ markdown: String, isHeader: Bool) {
    let down = Down(markdownString: markdown)
    
    do {
      var attributedString = try down.toAttributedString(styler: styler)
      
      // Apply custom text color if provided
      if let color = customTextColor {
        let mutable = NSMutableAttributedString(attributedString: attributedString)
        mutable.addAttribute(.foregroundColor, value: color, range: NSRange(location: 0, length: mutable.length))
        attributedString = mutable
      }
      
      // Apply inline code styling
      attributedString = addTableInlineCodeStyling(to: attributedString)
      
      textView.attributedText = attributedString
    } catch {
      textView.text = markdown
      textView.textColor = customTextColor ?? .markdownText
      textView.font = UIFont.systemFont(ofSize: 13, weight: isHeader ? .semibold : .regular)
    }
  }
  
  /// Calculate the size needed to display the content
  func sizeThatFitsContent(maxWidth: CGFloat) -> CGSize {
    let targetSize = CGSize(width: maxWidth, height: CGFloat.greatestFiniteMagnitude)
    return textView.sizeThatFits(targetSize)
  }
}

/// Apply inline code background styling for table cells
private func addTableInlineCodeStyling(to attributedString: NSAttributedString) -> NSAttributedString {
  let mutable = NSMutableAttributedString(attributedString: attributedString)
  
  mutable.enumerateAttributes(in: NSRange(location: 0, length: mutable.length), options: []) { attributes, range, _ in
    if let font = attributes[.font] as? UIFont,
       font.fontDescriptor.symbolicTraits.contains(.traitMonoSpace) {
      mutable.addAttribute(.backgroundColor, value: UIColor.markdownAccent, range: range)
      mutable.addAttribute(.foregroundColor, value: UIColor.markdownAccentForeground, range: range)
    }
  }
  
  return mutable
}

// MARK: - Table Block View

/**
 * Custom view for rendering markdown tables with horizontal scroll support.
 * Styled to match the app's design system.
 */
class TableBlockView: UIView {
  
  private let scrollView = UIScrollView()
  private let tableContainer = UIView()
  private var tableData: TableData?
  private var customTextColor: UIColor?
  private var useBackgroundColor: Bool
  private var calculatedHeight: CGFloat = 0
  
  init(tableData: TableData, customTextColor: UIColor? = nil, useBackgroundColor: Bool = true) {
    self.useBackgroundColor = useBackgroundColor
    super.init(frame: .zero)
    self.tableData = tableData
    self.customTextColor = customTextColor
    setupView()
    renderTable()
  }
  
  required init?(coder: NSCoder) {
    fatalError("init(coder:) not implemented")
  }
  
  private func setupView() {
    // Container styling
    backgroundColor = useBackgroundColor ? .markdownBackground : .clear
    layer.borderColor = UIColor.markdownBorder.cgColor
    layer.borderWidth = 1
    layer.cornerRadius = 8
    clipsToBounds = true
    
    // Horizontal scroll view
    scrollView.translatesAutoresizingMaskIntoConstraints = false
    scrollView.showsHorizontalScrollIndicator = true
    scrollView.showsVerticalScrollIndicator = false
    scrollView.alwaysBounceHorizontal = false
    addSubview(scrollView)
    
    // Table container inside scroll view
    tableContainer.translatesAutoresizingMaskIntoConstraints = false
    scrollView.addSubview(tableContainer)
    
    NSLayoutConstraint.activate([
      scrollView.topAnchor.constraint(equalTo: topAnchor),
      scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
      scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
      scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),
      
      tableContainer.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor),
      tableContainer.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor),
      tableContainer.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor),
      tableContainer.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor)
    ])
  }
  
  private func renderTable() {
    guard let data = tableData else { return }
    
    // Clear existing content
    tableContainer.subviews.forEach { $0.removeFromSuperview() }
    
    let columnCount = data.headers.count
    guard columnCount > 0 else { return }
    
    let minColumnWidth: CGFloat = 80
    let cellPadding: CGFloat = 16  // Total horizontal padding in cell
    let minRowHeight: CGFloat = 36
    
    // First pass: create all cells and measure their natural sizes
    var headerCells: [TableCellView] = []
    var dataCells: [[TableCellView]] = []
    
    // Create header cells
    for header in data.headers {
      let cell = TableCellView(markdown: header, isHeader: true, textColor: customTextColor)
      headerCells.append(cell)
    }
    
    // Create data cells
    for row in data.rows {
      var rowCells: [TableCellView] = []
      for colIndex in 0..<columnCount {
        let text = colIndex < row.count ? row[colIndex] : ""
        let cell = TableCellView(markdown: text, isHeader: false, textColor: customTextColor)
        rowCells.append(cell)
      }
      dataCells.append(rowCells)
    }
    
    // Calculate column widths based on content (no max limit)
    var columnWidths: [CGFloat] = Array(repeating: minColumnWidth, count: columnCount)
    
    // Measure headers
    for (index, cell) in headerCells.enumerated() {
      let size = cell.sizeThatFitsContent(maxWidth: 500)
      columnWidths[index] = max(columnWidths[index], size.width + cellPadding)
    }
    
    // Measure data cells
    for rowCells in dataCells {
      for (index, cell) in rowCells.enumerated() {
        let size = cell.sizeThatFitsContent(maxWidth: 500)
        columnWidths[index] = max(columnWidths[index], size.width + cellPadding)
      }
    }
    
    let totalWidth = columnWidths.reduce(0, +)
    
    // Calculate row heights based on content
    var rowHeights: [CGFloat] = []
    
    // Header row height
    var headerHeight: CGFloat = minRowHeight
    for (index, cell) in headerCells.enumerated() {
      let size = cell.sizeThatFitsContent(maxWidth: columnWidths[index])
      headerHeight = max(headerHeight, size.height)
    }
    rowHeights.append(headerHeight)
    
    // Data row heights
    for rowCells in dataCells {
      var rowHeight: CGFloat = minRowHeight
      for (index, cell) in rowCells.enumerated() {
        let size = cell.sizeThatFitsContent(maxWidth: columnWidths[index])
        rowHeight = max(rowHeight, size.height)
      }
      rowHeights.append(rowHeight)
    }
    
    let totalHeight = rowHeights.reduce(0, +)
    calculatedHeight = totalHeight
    
    // Layout cells
    var currentY: CGFloat = 0
    
    // Header row background
    let headerBg = UIView()
    headerBg.backgroundColor = .markdownAccent
    headerBg.frame = CGRect(x: 0, y: 0, width: totalWidth, height: rowHeights[0])
    tableContainer.addSubview(headerBg)
    
    // Header cells
    var currentX: CGFloat = 0
    for (colIndex, cell) in headerCells.enumerated() {
      cell.frame = CGRect(x: currentX, y: currentY, width: columnWidths[colIndex], height: rowHeights[0])
      tableContainer.addSubview(cell)
      
      // Vertical border
      if colIndex < columnCount - 1 {
        let border = UIView()
        border.backgroundColor = .markdownBorder
        border.frame = CGRect(x: currentX + columnWidths[colIndex] - 0.5, y: currentY, width: 1, height: rowHeights[0])
        tableContainer.addSubview(border)
      }
      
      currentX += columnWidths[colIndex]
    }
    
    // Header bottom border
    let headerBorder = UIView()
    headerBorder.backgroundColor = .markdownBorder
    headerBorder.frame = CGRect(x: 0, y: rowHeights[0] - 1, width: totalWidth, height: 1)
    tableContainer.addSubview(headerBorder)
    
    currentY = rowHeights[0]
    
    // Data rows
    for (rowIndex, rowCells) in dataCells.enumerated() {
      currentX = 0
      let rowHeight = rowHeights[rowIndex + 1]
      
      for (colIndex, cell) in rowCells.enumerated() {
        cell.frame = CGRect(x: currentX, y: currentY, width: columnWidths[colIndex], height: rowHeight)
        tableContainer.addSubview(cell)
        
        // Vertical border
        if colIndex < columnCount - 1 {
          let border = UIView()
          border.backgroundColor = .markdownBorder
          border.frame = CGRect(x: currentX + columnWidths[colIndex] - 0.5, y: currentY, width: 1, height: rowHeight)
          tableContainer.addSubview(border)
        }
        
        currentX += columnWidths[colIndex]
      }
      
      // Row bottom border (except last row)
      if rowIndex < dataCells.count - 1 {
        let rowBorder = UIView()
        rowBorder.backgroundColor = .markdownBorder
        rowBorder.frame = CGRect(x: 0, y: currentY + rowHeight - 0.5, width: totalWidth, height: 0.5)
        tableContainer.addSubview(rowBorder)
      }
      
      currentY += rowHeight
    }
    
    // Set container size constraints
    tableContainer.widthAnchor.constraint(equalToConstant: totalWidth).isActive = true
    tableContainer.heightAnchor.constraint(equalToConstant: totalHeight).isActive = true
  }
  
  override var intrinsicContentSize: CGSize {
    return CGSize(width: UIView.noIntrinsicMetric, height: calculatedHeight)
  }
  
  override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
    super.traitCollectionDidChange(previousTraitCollection)
    layer.borderColor = UIColor.markdownBorder.cgColor
  }
}
