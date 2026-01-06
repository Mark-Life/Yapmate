import ExpoModulesCore

public class NativeMarkdownModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeMarkdown")

    View(NativeMarkdownView.self) {
      Events("onContentSizeChange", "onContextMenuAction")
      
      Prop("content") { (view, content: String) in
        view.setContent(content)
      }
      
      Prop("contextMenuActions") { (view, actions: [[String: String]]?) in
        view.setContextMenuActions(actions ?? [])
      }
      
      Prop("textColor") { (view, colorHex: String?) in
        view.setTextColor(colorHex)
      }
      
      Prop("backgroundColor") { (view, colorHex: String?) in
        view.setBubbleBackgroundColor(colorHex)
      }
      
      Prop("paddingHorizontal") { (view, padding: CGFloat?) in
        view.setPaddingHorizontal(padding ?? 0)
      }
      
      Prop("paddingVertical") { (view, padding: CGFloat?) in
        view.setPaddingVertical(padding ?? 0)
      }
      
      Prop("borderRadius") { (view, radius: CGFloat?) in
        view.setBorderRadius(radius ?? 0)
      }
      
      Prop("isUser") { (view, isUser: Bool?) in
        view.setIsUser(isUser ?? false)
      }
      
      Prop("maxWidthPercentage") { (view, percentage: CGFloat?) in
        view.setMaxWidthPercentage(percentage)
      }
    }
  }
}
