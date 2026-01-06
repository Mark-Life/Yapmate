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
  
  /// Parse hex color string to UIColor
  static func fromHex(_ hex: String) -> UIColor? {
    var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
    
    var rgb: UInt64 = 0
    guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }
    
    let length = hexSanitized.count
    if length == 6 {
      return UIColor(
        red: CGFloat((rgb & 0xFF0000) >> 16) / 255.0,
        green: CGFloat((rgb & 0x00FF00) >> 8) / 255.0,
        blue: CGFloat(rgb & 0x0000FF) / 255.0,
        alpha: 1.0
      )
    } else if length == 8 {
      return UIColor(
        red: CGFloat((rgb & 0xFF000000) >> 24) / 255.0,
        green: CGFloat((rgb & 0x00FF0000) >> 16) / 255.0,
        blue: CGFloat((rgb & 0x0000FF00) >> 8) / 255.0,
        alpha: CGFloat(rgb & 0x000000FF) / 255.0
      )
    }
    return nil
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
  private let scrollView = UIScrollView()
  private let codeLabel = UILabel()
  private var codeText: String = ""
  private var isCopied = false
  private let customTextColor: UIColor?
  private var codeLabelWidthConstraint: NSLayoutConstraint?
  
  init(code: String, language: String?, customTextColor: UIColor? = nil) {
    self.customTextColor = customTextColor
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
    
    // Horizontal scroll view for code
    scrollView.translatesAutoresizingMaskIntoConstraints = false
    scrollView.showsHorizontalScrollIndicator = true
    scrollView.showsVerticalScrollIndicator = false
    scrollView.alwaysBounceHorizontal = false
    addSubview(scrollView)
    
    // Code label - no line limit, natural width for scrolling
    codeLabel.font = UIFont.monospacedSystemFont(ofSize: 13, weight: .regular)
    codeLabel.textColor = customTextColor ?? .markdownText
    codeLabel.numberOfLines = 0
    codeLabel.lineBreakMode = .byClipping // Don't wrap, allow scroll
    codeLabel.translatesAutoresizingMaskIntoConstraints = false
    scrollView.addSubview(codeLabel)
    
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
      
      // Scroll view
      scrollView.topAnchor.constraint(equalTo: headerView.bottomAnchor, constant: 12),
      scrollView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
      scrollView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -12),
      scrollView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -12),
      
      // Code label inside scroll view - pinned to edges for scrolling
      codeLabel.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor),
      codeLabel.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor),
      codeLabel.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor),
      codeLabel.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor),
      
      // Height matches scroll view (no vertical scrolling)
      codeLabel.heightAnchor.constraint(equalTo: scrollView.frameLayoutGuide.heightAnchor)
    ])
  }
  
  private func setCode(_ code: String) {
    codeLabel.text = code
    // Force layout to update scroll content size
    setNeedsLayout()
    layoutIfNeeded()
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
  private let customTextColor: UIColor?
  
  init(styler: DownStyler, customTextColor: UIColor? = nil) {
    self.styler = styler
    self.customTextColor = customTextColor
    super.init(frame: .zero)
    setupView()
  }
  
  required init?(coder: NSCoder) {
    fatalError("init(coder:) not implemented")
  }
  
  private func setupView() {
    textView.isEditable = false
    textView.isScrollEnabled = false
    // Note: isSelectable must be true for text to render properly in some iOS versions
    // We disable the selection gesture instead
    textView.isSelectable = true
    textView.backgroundColor = .clear
    textView.textContainerInset = .zero
    textView.textContainer.lineFragmentPadding = 0
    textView.delegate = self
    textView.isUserInteractionEnabled = true
    textView.translatesAutoresizingMaskIntoConstraints = false
    
    // Content hugging: prefer intrinsic size (shrink-wrap)
    // Content compression: allow compression when needed (text will wrap)
    textView.setContentHuggingPriority(.defaultHigh, for: .horizontal)
    textView.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
    
    textView.linkTextAttributes = [
      .foregroundColor: UIColor.markdownLink,
      .underlineStyle: NSUnderlineStyle.single.rawValue
    ]
    
    // Disable text selection gesture while keeping isSelectable=true for rendering
    for gesture in textView.gestureRecognizers ?? [] {
      if gesture is UILongPressGestureRecognizer {
        gesture.isEnabled = false
      }
    }
    
    addSubview(textView)
    
    // Set content priorities on self as well
    setContentHuggingPriority(.defaultHigh, for: .horizontal)
    setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
    
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
      var attributedString = try down.toAttributedString(styler: styler)
      attributedString = addInlineCodeStyling(to: attributedString)
      
      // Apply custom text color if provided
      if let color = customTextColor {
        attributedString = applyCustomTextColor(to: attributedString, color: color)
      }
      
      textView.attributedText = attributedString
    } catch {
      textView.text = markdown
      textView.textColor = customTextColor ?? .markdownText
      textView.font = UIFont.systemFont(ofSize: 14)
    }
    
    // Force layout update - workaround for isSelectable=false quirk
    textView.setNeedsLayout()
    textView.layoutIfNeeded()
    setNeedsLayout()
  }
  
  /// Apply custom text color to entire attributed string
  private func applyCustomTextColor(to attributedString: NSAttributedString, color: UIColor) -> NSAttributedString {
    let mutable = NSMutableAttributedString(attributedString: attributedString)
    let fullRange = NSRange(location: 0, length: mutable.length)
    
    // Apply color to the entire range
    mutable.addAttribute(.foregroundColor, value: color, range: fullRange)
    
    return mutable
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

// MARK: - Context Menu Action

struct ContextMenuAction {
  let title: String
  let systemIcon: String
  let index: Int
}

// MARK: - Native Markdown View

class NativeMarkdownView: ExpoView, UIContextMenuInteractionDelegate {
  
  private let stackView = UIStackView()
  private var lastReportedHeight: CGFloat = 0
  private var lastReportedWidth: CGFloat = 0
  private var contextMenuActions: [ContextMenuAction] = []
  private var contextMenuInteraction: UIContextMenuInteraction?
  private var customTextColor: UIColor?
  private var currentContent: String = ""
  
  // Bubble styling
  private var paddingH: CGFloat = 0
  private var paddingV: CGFloat = 0
  private var bubbleRadius: CGFloat = 0
  private var isUserMessage: Bool = false
  private var maxWidthPercentage: CGFloat = 95.0
  
  // Constraint references for dynamic padding
  private var topConstraint: NSLayoutConstraint?
  private var bottomConstraint: NSLayoutConstraint?
  private var leadingConstraint: NSLayoutConstraint?
  private var trailingConstraint: NSLayoutConstraint?
  private var maxWidthConstraint: NSLayoutConstraint?
  
  let onContentSizeChange = EventDispatcher()
  let onContextMenuAction = EventDispatcher()
  
  private lazy var styler: DownStyler = {
    DownStyler(configuration: createStylerConfiguration())
  }()
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setupView()
  }
  
  private func setupView() {
    clipsToBounds = true
    
    stackView.axis = .vertical
    stackView.spacing = 8
    stackView.alignment = .fill
    stackView.distribution = .equalSpacing
    stackView.translatesAutoresizingMaskIntoConstraints = false
    
    addSubview(stackView)
    
    topConstraint = stackView.topAnchor.constraint(equalTo: topAnchor, constant: paddingV)
    bottomConstraint = stackView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -paddingV)
    leadingConstraint = stackView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: paddingH)
    trailingConstraint = stackView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -paddingH)
    
    NSLayoutConstraint.activate([
      topConstraint!,
      bottomConstraint!,
      leadingConstraint!,
      trailingConstraint!
    ])
  }
  
  // MARK: - Bubble Styling Setters
  
  func setBubbleBackgroundColor(_ colorHex: String?) {
    if let hex = colorHex, let color = UIColor.fromHex(hex) {
      backgroundColor = color
    } else {
      backgroundColor = .clear
    }
  }
  
  func setPaddingHorizontal(_ padding: CGFloat) {
    paddingH = padding
    leadingConstraint?.constant = padding
    trailingConstraint?.constant = -padding
    updateLayoutAndReportSize()
  }
  
  func setPaddingVertical(_ padding: CGFloat) {
    paddingV = padding
    topConstraint?.constant = padding
    bottomConstraint?.constant = -padding
    updateLayoutAndReportSize()
  }
  
  func setBorderRadius(_ radius: CGFloat) {
    bubbleRadius = radius
    layer.cornerRadius = radius
  }
  
  func setIsUser(_ isUser: Bool) {
    isUserMessage = isUser
    // Re-report size with new user mode (affects width calculation)
    lastReportedHeight = 0
    lastReportedWidth = 0
    reportContentSizeIfNeeded()
  }
  
  func setMaxWidthPercentage(_ percentage: CGFloat?) {
    if let percentage = percentage {
      maxWidthPercentage = percentage
    } else {
      // Reset to default based on user type
      maxWidthPercentage = isUserMessage ? 85.0 : 95.0
    }
    updateMaxWidthConstraint()
  }
  
  private func updateMaxWidthConstraint() {
    // Remove existing maxWidth constraint
    maxWidthConstraint?.isActive = false
    
    // Find superview to constrain against
    guard let superview = superview else {
      // If no superview yet, we'll set it up in layoutSubviews
      return
    }
    
    // Create width constraint as percentage of superview width
    maxWidthConstraint = widthAnchor.constraint(lessThanOrEqualTo: superview.widthAnchor, multiplier: maxWidthPercentage / 100.0)
    maxWidthConstraint?.priority = UILayoutPriority(999) // High priority but not required
    maxWidthConstraint?.isActive = true
  }
  
  override func didMoveToSuperview() {
    super.didMoveToSuperview()
    if superview != nil {
      updateMaxWidthConstraint()
    }
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    // Ensure maxWidth constraint is set up once we have a superview
    if maxWidthConstraint == nil && superview != nil {
      updateMaxWidthConstraint()
    }
    reportContentSizeIfNeeded()
  }
  
  private func updateAlignmentConstraints() {
    // Always use fixed constraints on both sides
    // Width control and alignment are handled by React Native based on reported size
    leadingConstraint?.isActive = false
    trailingConstraint?.isActive = false
    
    leadingConstraint = stackView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: paddingH)
    trailingConstraint = stackView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -paddingH)
    
    NSLayoutConstraint.activate([
      leadingConstraint!,
      trailingConstraint!
    ])
    
    updateLayoutAndReportSize()
  }
  
  private func updateLayoutAndReportSize() {
    setNeedsLayout()
    layoutIfNeeded()
    lastReportedHeight = 0
    reportContentSizeIfNeeded()
  }
  
  // MARK: - Text Color Setter
  
  func setTextColor(_ colorHex: String?) {
    if let hex = colorHex {
      customTextColor = UIColor.fromHex(hex)
    } else {
      customTextColor = nil
    }
    // Re-render content with new color if we have content
    if !currentContent.isEmpty {
      setContent(currentContent)
    }
  }
  
  // MARK: - Context Menu Actions Setter
  
  func setContextMenuActions(_ actions: [[String: String]]) {
    contextMenuActions = actions.enumerated().compactMap { index, dict in
      guard let title = dict["title"], let systemIcon = dict["systemIcon"] else {
        return nil
      }
      return ContextMenuAction(title: title, systemIcon: systemIcon, index: index)
    }
    
    // Add or remove context menu interaction based on whether we have actions
    if contextMenuActions.isEmpty {
      if let interaction = contextMenuInteraction {
        removeInteraction(interaction)
        contextMenuInteraction = nil
      }
    } else if contextMenuInteraction == nil {
      let interaction = UIContextMenuInteraction(delegate: self)
      addInteraction(interaction)
      contextMenuInteraction = interaction
    }
  }
  
  // MARK: - UIContextMenuInteractionDelegate
  
  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    configurationForMenuAtLocation location: CGPoint
  ) -> UIContextMenuConfiguration? {
    guard !contextMenuActions.isEmpty else { return nil }
    
    return UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { [weak self] _ in
      guard let self = self else { return nil }
      
      let menuActions = self.contextMenuActions.map { action in
        UIAction(
          title: action.title,
          image: UIImage(systemName: action.systemIcon)
        ) { [weak self] _ in
          self?.onContextMenuAction([
            "index": action.index,
            "name": action.title
          ])
        }
      }
      
      return UIMenu(title: "", children: menuActions)
    }
  }
  
  // MARK: - Content Size Reporting
  
  private func reportContentSizeIfNeeded() {
    // For user messages, calculate intrinsic size based on content
    if isUserMessage {
      reportIntrinsicContentSize()
      return
    }
    
    // For assistant messages, use bounds width
    guard bounds.width > 0 else { return }
    
    // Calculate available width for content (minus horizontal padding)
    let contentWidth = bounds.width - (paddingH * 2)
    
    let stackSize = stackView.systemLayoutSizeFitting(
      CGSize(width: contentWidth, height: UIView.layoutFittingCompressedSize.height),
      withHorizontalFittingPriority: .required,
      verticalFittingPriority: .fittingSizeLevel
    )
    
    // Add padding to get total size
    let totalHeight = stackSize.height + (paddingV * 2)
    
    if abs(totalHeight - lastReportedHeight) > 1 {
      lastReportedHeight = totalHeight
      onContentSizeChange([
        "width": bounds.width,
        "height": totalHeight
      ])
    }
  }
  
  private func reportIntrinsicContentSize() {
    // Get screen width as max constraint
    let screenWidth = UIScreen.main.bounds.width
    let maxTotalWidth = screenWidth * (maxWidthPercentage / 100.0)
    let maxContentWidth = maxTotalWidth - (paddingH * 2)
    
    // First, calculate the natural (intrinsic) size of the content
    let intrinsicSize = stackView.systemLayoutSizeFitting(
      UIView.layoutFittingCompressedSize,
      withHorizontalFittingPriority: .fittingSizeLevel,
      verticalFittingPriority: .fittingSizeLevel
    )
    
    let finalWidth: CGFloat
    let finalHeight: CGFloat
    
    // Minimum width to avoid too narrow bubbles
    let minWidth: CGFloat = 20
    
    if intrinsicSize.width <= maxContentWidth {
      // Content fits naturally - shrink wrap to content
      finalWidth = max(intrinsicSize.width + (paddingH * 2), minWidth)
      finalHeight = intrinsicSize.height + (paddingV * 2)
    } else {
      // Content exceeds max width - use max width and recalculate height
      let constrainedSize = stackView.systemLayoutSizeFitting(
        CGSize(width: maxContentWidth, height: UIView.layoutFittingCompressedSize.height),
        withHorizontalFittingPriority: .required,
        verticalFittingPriority: .fittingSizeLevel
      )
      finalWidth = maxTotalWidth
      finalHeight = constrainedSize.height + (paddingV * 2)
    }
    
    // Only report if changed significantly
    if abs(finalHeight - lastReportedHeight) > 1 || abs(finalWidth - lastReportedWidth) > 1 {
      lastReportedHeight = finalHeight
      lastReportedWidth = finalWidth
      onContentSizeChange([
        "width": finalWidth,
        "height": finalHeight
      ])
    }
  }
  
  // MARK: - Content Setter
  
  func setContent(_ markdown: String) {
    currentContent = markdown
    
    // Clear existing views
    stackView.arrangedSubviews.forEach { $0.removeFromSuperview() }
    
    // Parse into segments
    let segments = parseMarkdownSegments(markdown)
    
    // Render each segment
    for segment in segments {
      switch segment {
      case .text(let text):
        let textView = TextSegmentView(styler: styler, customTextColor: customTextColor)
        textView.setMarkdown(text)
        stackView.addArrangedSubview(textView)
        
      case .codeBlock(let language, let code):
        let codeView = CodeBlockView(code: code, language: language, customTextColor: customTextColor)
        stackView.addArrangedSubview(codeView)
      }
    }
    
    // Reset and report size
    lastReportedHeight = 0
    lastReportedWidth = 0
    DispatchQueue.main.async { [weak self] in
      self?.setNeedsLayout()
      self?.layoutIfNeeded()
      self?.reportContentSizeIfNeeded()
    }
  }
}
