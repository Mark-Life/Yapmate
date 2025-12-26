import { useColorScheme } from "nativewind";
import { ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

/**
 * Home page component
 */
export default function Index() {
  const { colorScheme } = useColorScheme();

  return (
    <ScrollView
      className={`flex-1 bg-background ${colorScheme === "dark" ? "dark" : ""}`}
    >
      <View className="flex-1 items-center justify-center gap-8 p-8">
        <View className="items-center gap-4">
          <Text variant="h1">Welcome to Nativewind!</Text>
          <Text className="text-center text-muted-foreground" variant="p">
            This app demonstrates the UI components
          </Text>
        </View>

        <View className="w-full gap-6">
          <View className="gap-3">
            <Text variant="h3">Text Variants</Text>
            <Text variant="h1">Heading 1</Text>
            <Text variant="h2">Heading 2</Text>
            <Text variant="h3">Heading 3</Text>
            <Text variant="h4">Heading 4</Text>
            <Text variant="p">This is a paragraph text with some content.</Text>
            <Text variant="lead">This is a lead text variant.</Text>
            <Text variant="large">Large text</Text>
            <Text variant="small">Small text</Text>
            <Text variant="muted">Muted text</Text>
            <Text variant="code">code text</Text>
          </View>

          <View className="gap-3">
            <Text variant="h3">Button Variants</Text>
            <Button variant="default">
              <Text>Default Button</Text>
            </Button>
            <Button variant="secondary">
              <Text>Secondary Button</Text>
            </Button>
            <Button variant="destructive">
              <Text>Destructive Button</Text>
            </Button>
            <Button variant="outline">
              <Text>Outline Button</Text>
            </Button>
            <Button variant="ghost">
              <Text>Ghost Button</Text>
            </Button>
            <Button variant="link">
              <Text>Link Button</Text>
            </Button>
          </View>

          <View className="gap-3">
            <Text variant="h3">Button Sizes</Text>
            <Button size="sm">
              <Text>Small Button</Text>
            </Button>
            <Button size="default">
              <Text>Default Button</Text>
            </Button>
            <Button size="lg">
              <Text>Large Button</Text>
            </Button>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
