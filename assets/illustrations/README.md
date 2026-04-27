# SVG Illustrations Guide

How to export SVG from Figma and use them in the app.

## 📤 Exporting from Figma

### Step 1: Prepare Your Illustration in Figma

1. **Select your illustration** frame/group
2. **Remove any unnecessary layers**
   - Delete hidden layers
   - Flatten complex groups if possible
   - Remove masks if not needed
3. **Set proper frame size**
   - Standard: 400x400px (scales well)
   - Or use responsive frame (no fixed width/height)

### Step 2: Export Settings

1. **Select the frame**
2. **In the Export section (bottom right):**
   - Click "+" to add export
   - Format: **SVG**
   - Settings (click gear icon):
     - ✅ Include "id" attribute
     - ✅ Outline text (if using custom fonts)
     - ❌ Uncheck "Simplify stroke" (keep it false for better quality)
     - ❌ Uncheck "Use CSS inlining" (for better React Native compatibility)
3. **Export**

### Step 3: Clean Up the SVG (Optional but Recommended)

After exporting, you may want to:

1. **Open SVG in a text editor**
2. **Remove Figma-specific attributes:**
   - Remove `id` attributes if not needed
   - Remove `data-*` attributes
3. **Simplify if needed:**
   - Use [SVGO](https://jakearchibald.github.io/svgomg/) online tool
   - Or use VS Code extension: "SVG Optimizer"

### Step 4: Make it Theme-Aware (Optional)

If you want the SVG to respond to light/dark mode:

```xml
<!-- Instead of hardcoded colors -->
<path fill="#000000" />

<!-- Use currentColor to inherit from parent -->
<path fill="currentColor" />
```

Then in your component:
```tsx
<YourSvg color={colorScheme === 'dark' ? '#ffffff' : '#000000'} />
```

---

## 🎨 Using SVG in React Native

### Basic Usage

```tsx
import WelcomeIllustration from '@/assets/illustrations/welcome-illustration.svg';

export default function MyScreen() {
  return (
    <View className="items-center justify-center">
      <WelcomeIllustration width={300} height={300} />
    </View>
  );
}
```

### Responsive Sizing

```tsx
// Percentage-based (fills container)
<WelcomeIllustration 
  width="100%" 
  height="100%"
  style={{ maxWidth: 400, maxHeight: 400 }}
/>

// Fixed size
<WelcomeIllustration width={300} height={300} />

// Aspect ratio maintained with flex
<View className="flex-1 items-center justify-center">
  <WelcomeIllustration 
    width="80%" 
    height="80%"
    preserveAspectRatio="xMidYMid meet"
  />
</View>
```

### Theme-Aware Colors

```tsx
import { useColorScheme } from 'nativewind';

function MyComponent() {
  const { colorScheme } = useColorScheme();
  
  return (
    <WelcomeIllustration 
      width={300}
      height={300}
      color={colorScheme === 'dark' ? '#ffffff' : '#000000'}
      // If your SVG has multiple colors, you can pass them as props
    />
  );
}
```

### Advanced: Custom Props

If you need to control specific colors in your SVG:

```tsx
// 1. Modify your SVG to accept props
// welcome-illustration.svg (after export, open in editor)
<svg>
  <circle fill="{primaryColor}" />
  <rect fill="{secondaryColor}" />
</svg>

// 2. Use with custom props
<WelcomeIllustration 
  primaryColor="#3b82f6"
  secondaryColor="#10b981"
  width={300}
  height={300}
/>
```

---

## 📁 File Organization

```
assets/
└── illustrations/
    ├── README.md                    # This file
    ├── welcome-illustration.svg     # Welcome screen
    ├── empty-state-tasks.svg        # Empty state: No tasks
    ├── empty-state-projects.svg     # Empty state: No projects
    ├── error-404.svg                # 404 error
    └── success-confetti.svg         # Success state
```

### Naming Convention

- Use kebab-case: `empty-state-users.svg`
- Be descriptive: `onboarding-step-1.svg` not just `step1.svg`
- Include context: `welcome-illustration.svg` not just `welcome.svg`

---

## 🎯 Best Practices

### 1. Optimize File Size

- Keep SVG files under 100KB
- Remove unnecessary groups and layers in Figma
- Use SVGO to optimize
- Avoid complex gradients (use simple colors)

### 2. Accessibility

```tsx
<WelcomeIllustration 
  width={300}
  height={300}
  accessibilityLabel="Welcome illustration"
  accessibilityRole="image"
/>
```

### 3. Performance

- Don't use too many SVGs on one screen
- For simple icons, use `lucide-react-native` instead
- For complex illustrations, consider using PNG/WebP with different densities

### 4. Design Guidelines

- **Size:** Export at 1x (400x400px typical)
- **Colors:** Use theme-friendly colors (consider light/dark mode)
- **Complexity:** Keep paths simple (< 100 paths per illustration)
- **Aspect Ratio:** Prefer square or 16:9 for flexibility

---

## 🐛 Troubleshooting

### SVG not showing?

1. **Restart dev server** (required after metro.config.js changes)
   ```bash
   pnpm dev
   ```

2. **Clear metro cache**
   ```bash
   pnpm dev -- --clear
   ```

3. **Check import path**
   ```tsx
   // ✅ Correct
   import Logo from '@/assets/illustrations/logo.svg';
   
   // ❌ Wrong - missing .svg extension
   import Logo from '@/assets/illustrations/logo';
   ```

### SVG looks broken?

1. **Check viewBox:** Make sure your SVG has a `viewBox` attribute
   ```xml
   <svg viewBox="0 0 400 400">
   ```

2. **Remove fixed dimensions:** Let width/height be controlled by props
   ```xml
   <!-- Remove these from SVG file -->
   <svg width="400" height="400">
   
   <!-- Keep only viewBox -->
   <svg viewBox="0 0 400 400">
   ```

3. **Outline text:** Re-export with "Outline text" enabled in Figma

### Colors not changing with theme?

1. Use `currentColor` in SVG:
   ```xml
   <path fill="currentColor" />
   ```

2. Pass color prop:
   ```tsx
   <YourSvg color={colorScheme === 'dark' ? '#fff' : '#000'} />
   ```

---

## 📚 Additional Resources

- [react-native-svg docs](https://github.com/software-mansion/react-native-svg)
- [SVGO online optimizer](https://jakearchibald.github.io/svgomg/)
- [Figma SVG export guide](https://help.figma.com/hc/en-us/articles/360040028114-Guide-to-exports-in-Figma)
