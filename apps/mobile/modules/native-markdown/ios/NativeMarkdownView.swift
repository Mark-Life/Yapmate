import ExpoModulesCore
import Down
import UIKit

class NativeMarkdownView: ExpoView {
  
  let textView = UITextView()
  private var lastReportedHeight: CGFloat = 0
  let onContentSizeChange = EventDispatcher()
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = false
    
    textView.isEditable = false
    textView.isScrollEnabled = false
    textView.backgroundColor = .clear
    textView.textContainerInset = .zero
    textView.textContainer.lineFragmentPadding = 0
    textView.linkTextAttributes = [
      .foregroundColor: UIColor.systemBlue,
      .underlineStyle: NSUnderlineStyle.single.rawValue
    ]
    
    addSubview(textView)
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    textView.frame = bounds
    reportContentSizeIfNeeded()
  }
  
  private func reportContentSizeIfNeeded() {
    guard bounds.width > 0 else { return }
    
    let size = textView.sizeThatFits(CGSize(width: bounds.width, height: .greatestFiniteMagnitude))
    
    // Only report if height changed significantly (avoid infinite loops)
    if abs(size.height - lastReportedHeight) > 1 {
      lastReportedHeight = size.height
      print("[NativeMarkdown] Reporting size: \(size.width) x \(size.height)")
      onContentSizeChange([
        "width": size.width,
        "height": size.height
      ])
    }
  }
  
  func setContent(_ markdown: String) {
    print("[NativeMarkdown] setContent called: \(markdown.prefix(30))...")
    textView.text = markdown
    textView.textColor = UIColor.label
    textView.font = UIFont.systemFont(ofSize: 16)
    
    // Reset last reported height to force re-report
    lastReportedHeight = 0
    
    // Report size after next layout
    DispatchQueue.main.async { [weak self] in
      self?.reportContentSizeIfNeeded()
    }
  }
}
