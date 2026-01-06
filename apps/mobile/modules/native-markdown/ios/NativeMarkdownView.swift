import ExpoModulesCore
import Down
import UIKit

// MARK: - Dynamic Colors

extension UIColor {
  /// Text foreground - matches app's foreground token
  static var markdownText: UIColor {
    UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(white: 0.96, alpha: 1)  // hsl(0 0% 96%)
        : UIColor(white: 0.06, alpha: 1)  // hsl(0 0% 6%)
    }
  }
  
  /// Link color - matches app's primary token
  static var markdownLink: UIColor {
    UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(red: 0.28, green: 0.82, blue: 0.80, alpha: 1)  // hsl(178 60% 55%)
        : UIColor(red: 0.07, green: 0.45, blue: 0.56, alpha: 1)  // hsl(198 79% 35%)
    }
  }
  
  /// Accent background - for inline code and code blocks
  /// Light: hsl(176 25% 89%), Dark: rgba(71, 209, 204, 0.125)
  static var markdownAccent: UIColor {
    UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(red: 0.28, green: 0.82, blue: 0.80, alpha: 0.125)  // rgba(71, 209, 204, 0.125)
        : UIColor(red: 0.84, green: 0.91, blue: 0.90, alpha: 1)      // hsl(176 25% 89%)
    }
  }
  
  /// Border color - for code blocks
  /// Light: hsl(198 79% 35% / 0.2), Dark: hsl(178 60% 55% / 0.2)
  static var markdownBorder: UIColor {
    UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(red: 0.28, green: 0.82, blue: 0.80, alpha: 0.2)  // hsl(178 60% 55% / 0.2)
        : UIColor(red: 0.07, green: 0.45, blue: 0.56, alpha: 0.2)  // hsl(198 79% 35% / 0.2)
    }
  }
  
  /// Blockquote border/accent
  static var markdownBlockquote: UIColor {
    UIColor { traits in
      traits.userInterfaceStyle == .dark
        ? UIColor(white: 0.3, alpha: 1)
        : UIColor(white: 0.7, alpha: 1)
    }
  }
}

// MARK: - Markdown Segment Types

enum MarkdownSegment {
  case text(String)
  case codeBlock(language: String?, code: String)
}

// MARK: - Markdown Parser

/**
 * Parses markdown into segments of text and code blocks.
 */
private func parseMarkdownSegments(_ markdown: String) -> [MarkdownSegment] {
  var segments: [MarkdownSegment] = []
  
  // Regex to match fenced code blocks: ```language\ncode\n```
  let pattern = "```([a-zA-Z0-9_-]*)\\n([\\s\\S]*?)```"
  guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else {
    return [.text(markdown)]
  }
  
  let nsString = markdown as NSString
  let matches = regex.matches(in: markdown, options: [], range: NSRange(location: 0, length: nsString.length))
  
  var lastEnd = 0
  
  for match in matches {
    // Text before this code block
    if match.range.location > lastEnd {
      let textRange = NSRange(location: lastEnd, length: match.range.location - lastEnd)
      let text = nsString.substring(with: textRange)
      if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
        segments.append(.text(text))
      }
    }
    
    // Extract language and code
    let languageRange = match.range(at: 1)
    let codeRange = match.range(at: 2)
    
    let language = languageRange.location != NSNotFound
      ? nsString.substring(with: languageRange)
      : nil
    let code = codeRange.location != NSNotFound
      ? nsString.substring(with: codeRange)
      : ""
    
    segments.append(.codeBlock(
      language: language?.isEmpty == true ? nil : language,
      code: code.trimmingCharacters(in: .newlines)
    ))
    
    lastEnd = match.range.location + match.range.length
  }
  
  // Text after last code block
  if lastEnd < nsString.length {
    let text = nsString.substring(from: lastEnd)
    if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      segments.append(.text(text))
    }
  }
  
  // If no code blocks found, return the whole thing as text
  if segments.isEmpty {
    segments.append(.text(markdown))
  }
  
  return segments
}

// MARK: - Markdown Styler Configuration

private func createStylerConfiguration() -> DownStylerConfiguration {
  var fonts = StaticFontCollection()
  
  fonts.body = UIFont.systemFont(ofSize: 14, weight: .regular)
  fonts.heading1 = UIFont.systemFont(ofSize: 24, weight: .bold)
  fonts.heading2 = UIFont.systemFont(ofSize: 20, weight: .bold)
  fonts.heading3 = UIFont.systemFont(ofSize: 18, weight: .semibold)
  fonts.heading4 = UIFont.systemFont(ofSize: 16, weight: .semibold)
  fonts.heading5 = UIFont.systemFont(ofSize: 14, weight: .semibold)
  fonts.heading6 = UIFont.systemFont(ofSize: 14, weight: .medium)
  fonts.code = UIFont.monospacedSystemFont(ofSize: 13, weight: .regular)
  fonts.listItemPrefix = UIFont.monospacedDigitSystemFont(ofSize: 14, weight: .regular)
  
  var colors = StaticColorCollection()
  colors.body = .markdownText
  colors.heading1 = .markdownText
  colors.heading2 = .markdownText
  colors.heading3 = .markdownText
  colors.heading4 = .markdownText
  colors.heading5 = .markdownText
  colors.heading6 = .markdownText
  colors.code = .markdownText
  colors.link = .markdownLink
  colors.quote = .markdownText
  colors.quoteStripe = .markdownBlockquote
  colors.codeBlockBackground = .clear  // We handle code blocks separately
  
  var paragraphStyles = StaticParagraphStyleCollection()
  
  let bodyStyle = NSMutableParagraphStyle()
  bodyStyle.lineSpacing = 4
  bodyStyle.paragraphSpacing = 8
  paragraphStyles.body = bodyStyle
  
  let h1Style = NSMutableParagraphStyle()
  h1Style.paragraphSpacingBefore = 24
  h1Style.paragraphSpacing = 12
  paragraphStyles.heading1 = h1Style
  
  let h2Style = NSMutableParagraphStyle()
  h2Style.paragraphSpacingBefore = 20
  h2Style.paragraphSpacing = 10
  paragraphStyles.heading2 = h2Style
  
  let h3Style = NSMutableParagraphStyle()
  h3Style.paragraphSpacingBefore = 16
  h3Style.paragraphSpacing = 8
  paragraphStyles.heading3 = h3Style
  
  let h4Style = NSMutableParagraphStyle()
  h4Style.paragraphSpacingBefore = 14
  h4Style.paragraphSpacing = 6
  paragraphStyles.heading4 = h4Style
  
  let h5Style = NSMutableParagraphStyle()
  h5Style.paragraphSpacingBefore = 12
  h5Style.paragraphSpacing = 4
  paragraphStyles.heading5 = h5Style
  
  let h6Style = NSMutableParagraphStyle()
  h6Style.paragraphSpacingBefore = 10
  h6Style.paragraphSpacing = 4
  paragraphStyles.heading6 = h6Style
  
  var config = DownStylerConfiguration()
  config.fonts = fonts
  config.colors = colors
  config.paragraphStyles = paragraphStyles
  
  config.listItemOptions = ListItemOptions(
    maxPrefixDigits: 2,
    spacingAfterPrefix: 6,
    spacingAbove: 2,
    spacingBelow: 2
  )
  
  config.quoteStripeOptions = QuoteStripeOptions(
    thickness: 3,
    spacingAfter: 8
  )
  
  return config
}

// MARK: - Inline Code Styling

private func addInlineCodeStyling(to attributedString: NSAttributedString) -> NSAttributedString {
  let mutable = NSMutableAttributedString(attributedString: attributedString)
  
  mutable.enumerateAttribute(.font, in: NSRange(location: 0, length: mutable.length)) { value, range, _ in
    guard let font = value as? UIFont else { return }
    
    if font.fontDescriptor.symbolicTraits.contains(.traitMonoSpace) {
      let text = (mutable.string as NSString).substring(with: range)
      let isInlineCode = !text.contains("\n")
      
      if isInlineCode {
        mutable.addAttribute(.backgroundColor, value: UIColor.markdownAccent, range: range)
      }
    }
  }
  
  return mutable
}

// MARK: - Code Block View

/**
 * Custom view for rendering code blocks with header (language + copy button).
 * Styled to match code-block.tsx React component.
 */
class CodeBlockView: UIView {
  
  private let headerView = UIView()
  private let headerBorder = UIView()
  private let languageLabel = UILabel()
  private let copyButton = UIButton(type: .system)
  private let codeLabel = UILabel()
  private var codeText: String = ""
  private var isCopied = false
  
  init(code: String, language: String?) {
    super.init(frame: .zero)
    self.codeText = code
    setupView(language: language)
    setCode(code)
  }
  
  required init?(coder: NSCoder) {
    fatalError("init(coder:) not implemented")
  }
  
  private func setupView(language: String?) {
    // Container styling
    backgroundColor = .markdownAccent
    layer.borderColor = UIColor.markdownBorder.cgColor
    layer.borderWidth = 1
    layer.cornerRadius = 8
    clipsToBounds = true
    
    // Header view
    headerView.translatesAutoresizingMaskIntoConstraints = false
    addSubview(headerView)
    
    // Header bottom border
    headerBorder.backgroundColor = .markdownBorder
    headerBorder.translatesAutoresizingMaskIntoConstraints = false
    headerView.addSubview(headerBorder)
    
    // Language label - monospace font, primary color
    languageLabel.font = UIFont.monospacedSystemFont(ofSize: 12, weight: .regular)
    languageLabel.textColor = .markdownLink  // Primary color
    languageLabel.text = language ?? "code"
    languageLabel.translatesAutoresizingMaskIntoConstraints = false
    headerView.addSubview(languageLabel)
    
    // Copy button - icon only, primary color
    copyButton.translatesAutoresizingMaskIntoConstraints = false
    updateCopyButtonState(copied: false)
    copyButton.addTarget(self, action: #selector(copyTapped), for: .touchUpInside)
    headerView.addSubview(copyButton)
    
    // Code label
    codeLabel.font = UIFont.monospacedSystemFont(ofSize: 13, weight: .regular)
    codeLabel.textColor = .markdownText
    codeLabel.numberOfLines = 0
    codeLabel.translatesAutoresizingMaskIntoConstraints = false
    addSubview(codeLabel)
    
    NSLayoutConstraint.activate([
      // Header
      headerView.topAnchor.constraint(equalTo: topAnchor),
      headerView.leadingAnchor.constraint(equalTo: leadingAnchor),
      headerView.trailingAnchor.constraint(equalTo: trailingAnchor),
      headerView.heightAnchor.constraint(equalToConstant: 32),
      
      // Header border
      headerBorder.leadingAnchor.constraint(equalTo: headerView.leadingAnchor),
      headerBorder.trailingAnchor.constraint(equalTo: headerView.trailingAnchor),
      headerBorder.bottomAnchor.constraint(equalTo: headerView.bottomAnchor),
      headerBorder.heightAnchor.constraint(equalToConstant: 1),
      
      // Language label
      languageLabel.leadingAnchor.constraint(equalTo: headerView.leadingAnchor, constant: 12),
      languageLabel.centerYAnchor.constraint(equalTo: headerView.centerYAnchor),
      
      // Copy button
      copyButton.trailingAnchor.constraint(equalTo: headerView.trailingAnchor, constant: -8),
      copyButton.centerYAnchor.constraint(equalTo: headerView.centerYAnchor),
      copyButton.widthAnchor.constraint(equalToConstant: 28),
      copyButton.heightAnchor.constraint(equalToConstant: 28),
      
      // Code label
      codeLabel.topAnchor.constraint(equalTo: headerView.bottomAnchor, constant: 12),
      codeLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
      codeLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -12),
      codeLabel.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -12)
    ])
  }
  
  private func setCode(_ code: String) {
    codeLabel.text = code
  }
  
  private func updateCopyButtonState(copied: Bool) {
    let config = UIImage.SymbolConfiguration(pointSize: 14, weight: .regular)
    let iconName = copied ? "checkmark" : "doc.on.doc"
    
    copyButton.setImage(UIImage(systemName: iconName, withConfiguration: config), for: .normal)
    copyButton.tintColor = .markdownLink  // Primary color for both states
    copyButton.setTitle(nil, for: .normal)
  }
  
  @objc private func copyTapped() {
    guard !isCopied else { return }
    
    // Copy to clipboard
    UIPasteboard.general.string = codeText
    
    // Haptic feedback
    let generator = UIImpactFeedbackGenerator(style: .light)
    generator.impactOccurred()
    
    // Show success state
    isCopied = true
    updateCopyButtonState(copied: true)
    
    // Reset after 1 second
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
      self?.isCopied = false
      self?.updateCopyButtonState(copied: false)
    }
  }
  
  override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
    super.traitCollectionDidChange(previousTraitCollection)
    layer.borderColor = UIColor.markdownBorder.cgColor
  }
}

// MARK: - Text Segment View

/**
 * View for rendering markdown text segments.
 */
class TextSegmentView: UIView, UITextViewDelegate {
  
  private let textView = UITextView()
  private let styler: DownStyler
  
  init(styler: DownStyler) {
    self.styler = styler
    super.init(frame: .zero)
    setupView()
  }
  
  required init?(coder: NSCoder) {
    fatalError("init(coder:) not implemented")
  }
  
  private func setupView() {
    textView.isEditable = false
    textView.isScrollEnabled = false
    textView.backgroundColor = .clear
    textView.textContainerInset = .zero
    textView.textContainer.lineFragmentPadding = 0
    textView.delegate = self
    textView.isUserInteractionEnabled = true
    textView.translatesAutoresizingMaskIntoConstraints = false
    
    textView.linkTextAttributes = [
      .foregroundColor: UIColor.markdownLink,
      .underlineStyle: NSUnderlineStyle.single.rawValue
    ]
    
    addSubview(textView)
    
    NSLayoutConstraint.activate([
      textView.topAnchor.constraint(equalTo: topAnchor),
      textView.leadingAnchor.constraint(equalTo: leadingAnchor),
      textView.trailingAnchor.constraint(equalTo: trailingAnchor),
      textView.bottomAnchor.constraint(equalTo: bottomAnchor)
    ])
  }
  
  func setMarkdown(_ markdown: String) {
    let down = Down(markdownString: markdown)
    
    do {
      let attributedString = try down.toAttributedString(styler: styler)
      let styledString = addInlineCodeStyling(to: attributedString)
      textView.attributedText = styledString
    } catch {
      textView.text = markdown
      textView.textColor = .markdownText
      textView.font = UIFont.systemFont(ofSize: 14)
    }
  }
  
  // MARK: - UITextViewDelegate
  
  func textView(
    _ textView: UITextView,
    shouldInteractWith URL: URL,
    in characterRange: NSRange,
    interaction: UITextItemInteraction
  ) -> Bool {
    UIApplication.shared.open(URL)
    return false
  }
}

// MARK: - Native Markdown View

class NativeMarkdownView: ExpoView {
  
  private let stackView = UIStackView()
  private var lastReportedHeight: CGFloat = 0
  let onContentSizeChange = EventDispatcher()
  
  private lazy var styler: DownStyler = {
    DownStyler(configuration: createStylerConfiguration())
  }()
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setupView()
  }
  
  private func setupView() {
    clipsToBounds = false
    
    stackView.axis = .vertical
    stackView.spacing = 8
    stackView.alignment = .fill
    stackView.distribution = .equalSpacing
    stackView.translatesAutoresizingMaskIntoConstraints = false
    
    addSubview(stackView)
    
    NSLayoutConstraint.activate([
      stackView.topAnchor.constraint(equalTo: topAnchor),
      stackView.leadingAnchor.constraint(equalTo: leadingAnchor),
      stackView.trailingAnchor.constraint(equalTo: trailingAnchor),
      stackView.bottomAnchor.constraint(equalTo: bottomAnchor)
    ])
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    reportContentSizeIfNeeded()
  }
  
  // MARK: - Content Size Reporting
  
  private func reportContentSizeIfNeeded() {
    guard bounds.width > 0 else { return }
    
    let size = stackView.systemLayoutSizeFitting(
      CGSize(width: bounds.width, height: UIView.layoutFittingCompressedSize.height),
      withHorizontalFittingPriority: .required,
      verticalFittingPriority: .fittingSizeLevel
    )
    
    if abs(size.height - lastReportedHeight) > 1 {
      lastReportedHeight = size.height
      onContentSizeChange([
        "width": size.width,
        "height": size.height
      ])
    }
  }
  
  // MARK: - Content Setter
  
  func setContent(_ markdown: String) {
    // Clear existing views
    stackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
    
    // Parse into segments
    let segments = parseMarkdownSegments(markdown)
    
    // Render each segment
    for segment in segments {
      switch segment {
      case .text(let text):
        let textView = TextSegmentView(styler: styler)
        textView.setMarkdown(text)
        stackView.addArrangedSubview(textView)
        
      case .codeBlock(let language, let code):
        let codeView = CodeBlockView(code: code, language: language)
        stackView.addArrangedSubview(codeView)
      }
    }
    
    // Reset and report size
    lastReportedHeight = 0
    DispatchQueue.main.async { [weak self] in
      self?.setNeedsLayout()
      self?.layoutIfNeeded()
      self?.reportContentSizeIfNeeded()
    }
  }
}
