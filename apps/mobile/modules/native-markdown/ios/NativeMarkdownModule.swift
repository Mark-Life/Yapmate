import ExpoModulesCore

public class NativeMarkdownModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeMarkdown")

    View(NativeMarkdownView.self) {
      Events("onContentSizeChange")
      
      Prop("content") { (view, content: String) in
        print("[NativeMarkdown] Prop content setter called")
        view.setContent(content)
      }
    }
  }
}
