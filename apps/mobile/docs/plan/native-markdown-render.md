# Native iOS Markdown Renderer

## Problem

Current JS-based markdown rendering causes performance issues during streaming:
- React re-renders entire tree on each content update
- `marked` parser creates new token objects every update
- App crashes with long streaming responses

Tried solutions that didn't work:
- Memoization (tokens change identity)
- `react-native-markdown-display` (same re-render issues)
- Throttling/debouncing (not smooth enough)

## Solution

Build native iOS markdown renderer using Expo Modules API + Down library.

**Why this works:**
- Parsing/rendering happens entirely on native thread
- UIKit handles text updates efficiently (native string diffing)
- No React reconciliation overhead
- `UITextView` with `NSAttributedString` is highly optimized

## Tech Stack

| Component | Library |
|-----------|---------|
| Expo Integration | [Expo Modules API](https://docs.expo.dev/modules/overview/) |
| Markdown Parser | [Down](https://github.com/johnxnguyen/Down) (CommonMark) |
| Rendering | `UITextView` + `NSAttributedString` |
| Code Highlighting | Later: [Highlightr](https://github.com/raspu/Highlightr) |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  React Component                                    │
│  <NativeMarkdown content={streamingContent} />      │
└─────────────────────┬───────────────────────────────┘
                      │ prop update (string)
                      ▼
┌─────────────────────────────────────────────────────┐
│  Expo Module Bridge                                 │
│  NativeMarkdownView.swift                           │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  Native iOS                                         │
│  ┌─────────────┐    ┌─────────────────────────────┐ │
│  │   Down      │───▶│  NSAttributedString         │ │
│  │  (parser)   │    │  (styled text)              │ │
│  └─────────────┘    └─────────────┬───────────────┘ │
│                                   │                 │
│                                   ▼                 │
│                     ┌─────────────────────────────┐ │
│                     │  UITextView                 │ │
│                     │  (renders attributed text)  │ │
│                     └─────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## File Structure

```
apps/mobile/
├── modules/
│   └── native-markdown/
│       ├── expo-module.config.json
│       ├── index.ts                    # JS exports
│       ├── ios/
│       │   ├── NativeMarkdown.podspec
│       │   ├── NativeMarkdownModule.swift
│       │   └── NativeMarkdownView.swift
│       └── src/
│           └── NativeMarkdownView.tsx  # React wrapper
├── src/
│   └── components/
│       └── ui/
│           └── markdown.tsx            # Updated to use native
```

## Implementation Steps

### Phase 1: Expo Module Setup

1. **Create module structure**
   ```bash
   mkdir -p apps/mobile/modules/native-markdown/ios
   mkdir -p apps/mobile/modules/native-markdown/src
   ```

2. **Create `expo-module.config.json`**
   ```json
   {
     "platforms": ["ios"],
     "ios": {
       "modules": ["NativeMarkdownModule"],
       "appDelegateSubscribers": []
     }
   }
   ```

3. **Create `NativeMarkdown.podspec`**
   - Add Down as dependency
   - Configure Swift version

4. **Update `app.json`** to include local module path

### Phase 2: Native iOS Implementation

1. **`NativeMarkdownModule.swift`**
   - Define the Expo module
   - Register the native view

2. **`NativeMarkdownView.swift`**
   - Subclass `ExpoView`
   - Create `UITextView` as subview
   - Implement `setContent(_ markdown: String)` prop
   - Parse markdown with Down
   - Apply styling to attributed string
   - Handle link taps

3. **Styling Configuration**
   - Define `DownStyler` for typography
   - Match app's design tokens (colors, fonts)
   - Support dark/light mode

### Phase 3: React Integration

1. **`src/NativeMarkdownView.tsx`**
   - Create React component wrapper
   - Use `requireNativeViewManager` from Expo
   - Type the props interface

2. **`index.ts`**
   - Export the React component
   - Export types

3. **Update `markdown.tsx`**
   - Import native component
   - Use native on iOS, keep JS fallback for web/Android

### Phase 4: Build & Test

1. Run `npx expo prebuild --clean`
2. Build with EAS or locally
3. Test streaming performance
4. Verify styling matches design

## Code Snippets

### NativeMarkdownView.swift (Core)

```swift
import ExpoModulesCore
import Down

public class NativeMarkdownView: ExpoView {
  private lazy var textView: UITextView = {
    let tv = UITextView()
    tv.isEditable = false
    tv.isScrollEnabled = false
    tv.backgroundColor = .clear
    tv.textContainerInset = .zero
    tv.textContainer.lineFragmentPadding = 0
    return tv
  }()
  
  private let styler: DownStyler = {
    var config = DownStylerConfiguration()
    // Configure fonts, colors, etc.
    return DownStyler(configuration: config)
  }()
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    addSubview(textView)
  }
  
  override public func layoutSubviews() {
    super.layoutSubviews()
    textView.frame = bounds
  }
  
  func setContent(_ markdown: String) {
    let down = Down(markdownString: markdown)
    if let attributedString = try? down.toAttributedString(styler: styler) {
      textView.attributedText = attributedString
    }
  }
}
```

### React Wrapper

```tsx
import { requireNativeViewManager } from 'expo-modules-core';
import { Platform } from 'react-native';

const NativeMarkdownViewIOS = requireNativeViewManager('NativeMarkdown');

type Props = {
  content: string;
  style?: ViewStyle;
};

export const NativeMarkdownView = ({ content, style }: Props) => {
  if (Platform.OS !== 'ios') {
    // Fallback to JS renderer on other platforms
    return <StreamingMarkdown content={content} />;
  }
  
  return <NativeMarkdownViewIOS content={content} style={style} />;
};
```

## Styling Considerations

### Typography Mapping

| Markdown | iOS Font |
|----------|----------|
| Body | System (SF Pro) 14pt |
| H1 | System Bold 24pt |
| H2 | System Bold 20pt |
| H3 | System Semibold 18pt |
| Code | SF Mono 13pt |
| Blockquote | System Italic 14pt |

### Colors (Dark Mode Support)

```swift
extension UIColor {
  static var markdownText: UIColor {
    UIColor { $0.userInterfaceStyle == .dark 
      ? .white 
      : .black 
    }
  }
  
  static var markdownLink: UIColor {
    UIColor.systemBlue
  }
  
  static var markdownCodeBg: UIColor {
    UIColor { $0.userInterfaceStyle == .dark 
      ? UIColor(white: 0.2, alpha: 1) 
      : UIColor(white: 0.95, alpha: 1) 
    }
  }
}
```

## Future Enhancements

### Code Syntax Highlighting (Phase 2)

Add [Highlightr](https://github.com/raspu/Highlightr) for code blocks:

```swift
import Highlightr

func renderCodeBlock(_ code: String, language: String?) -> NSAttributedString {
  let highlightr = Highlightr()
  highlightr?.setTheme(to: "atom-one-dark")
  return highlightr?.highlight(code, as: language) ?? NSAttributedString(string: code)
}
```

### Android Support (Phase 3)

Use [Markwon](https://github.com/noties/Markwon) library for Android:
- Similar architecture
- Native Kotlin implementation
- Supports streaming updates

## Dependencies

### iOS (Podspec)

```ruby
Pod::Spec.new do |s|
  s.name           = 'NativeMarkdown'
  s.version        = '1.0.0'
  s.summary        = 'Native iOS markdown renderer'
  s.author         = 'yapmate'
  s.homepage       = 'https://yapmate.ai'
  s.platforms      = { :ios => '15.0' }
  s.source         = { :git => '' }
  s.swift_version  = '5.0'
  s.source_files   = '**/*.swift'
  
  s.dependency 'ExpoModulesCore'
  s.dependency 'Down', '~> 0.11'
end
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Down doesn't handle streaming well | Test with partial markdown; may need `remend`-like completion on native side |
| Styling mismatch with design | Create comprehensive style config; test all markdown elements |
| Height calculation issues | Use `sizeThatFits` and report back to React for layout |
| Link handling | Implement delegate, bridge tap events to React |

## Success Metrics

- [ ] No crashes during long streaming responses
- [ ] Smooth 60fps scrolling while streaming
- [ ] Memory usage stable (no growth during stream)
- [ ] Styling matches current JS implementation
- [ ] Links are tappable and open correctly

## Timeline Estimate

| Phase | Time |
|-------|------|
| Phase 1: Module setup | 1-2 hours |
| Phase 2: Native implementation | 3-4 hours |
| Phase 3: React integration | 1-2 hours |
| Phase 4: Testing & polish | 2-3 hours |
| **Total** | **~1 day** |
