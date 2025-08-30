========================
CODE SNIPPETS
========================
TITLE: React Native Getting Started Guides
DESCRIPTION: New guides for getting started with React Native, explaining Native Components and providing an introduction to React for beginners.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/blog/2020-07-23-docs-update.md#_snippet_0

LANGUAGE: markdown
CODE:

```
- [New Getting Started guides](https://reactnative.dev/docs/getting-started)
- [explain what Native Components](https://reactnative.dev/docs/intro-react-native-components)
- [refresher/introduction to React](https://reactnative.dev/docs/intro-react)
```

---

TITLE: Install iOS Simulator in Xcode
DESCRIPTION: Steps to install an iOS Simulator within Xcode.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/_getting-started-macos-ios.md#_snippet_7

LANGUAGE: APIDOC
CODE:

```
Xcode Simulator Installation:
  Access via Xcode menu: Settings... > Platforms (or Components) tab.
  For Xcode 14.0+:
    Click '+' icon, select 'iOS…' option.
  For older versions:
    Select a simulator with the corresponding iOS version.
```

---

TITLE: Start Metro Bundler (npm)
DESCRIPTION: Starts the Metro bundler, which is essential for building and running React Native applications. This command is executed using npm.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-linux-android.md#_snippet_4

LANGUAGE: shell
CODE:

```
npm start
```

---

TITLE: Start Metro Bundler (yarn)
DESCRIPTION: Starts the Metro bundler, which is essential for building and running React Native applications. This command is executed using yarn.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-linux-android.md#_snippet_5

LANGUAGE: shell
CODE:

```
yarn start
```

---

TITLE: Run Example App
DESCRIPTION: Starts the example application for testing the native module. Use 'yarn example android' for Android and 'yarn example ios' for iOS.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.75/native-modules-setup.md#_snippet_2

LANGUAGE: shell
CODE:

```
# Android app
yarn example android
```

LANGUAGE: shell
CODE:

```
# iOS app
yarn example ios
```

---

TITLE: Run Example App
DESCRIPTION: Starts the example application for testing the native module. Use 'yarn example android' for Android and 'yarn example ios' for iOS.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.74/native-modules-setup.md#_snippet_2

LANGUAGE: shell
CODE:

```
# Android app
yarn example android
```

LANGUAGE: shell
CODE:

```
# iOS app
yarn example ios
```

---

TITLE: Xcode Command Line Tools Configuration
DESCRIPTION: Instructions for installing Xcode Command Line Tools via Xcode's settings.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/_getting-started-macos-ios.md#_snippet_6

LANGUAGE: APIDOC
CODE:

```
Xcode Model:
  __init__(self)
    Installs Xcode Command Line Tools.
    Access via Xcode menu: Settings... > Locations > Command Line Tools dropdown.
    Select the most recent version.
```

---

TITLE: Install Node and Watchman with Homebrew
DESCRIPTION: Installs Node.js and Watchman using the Homebrew package manager. Ensure Node.js is version 18 or newer.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/_getting-started-macos-ios.md#_snippet_0

LANGUAGE: shell
CODE:

```
brew install node
brew install watchman
```

---

TITLE: Install React Native Template
DESCRIPTION: Creates a new React Native project using a custom template.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/_getting-started-macos-ios.md#_snippet_3

LANGUAGE: shell
CODE:

```
npx react-native init AwesomeProject --template <template-name>
```

---

TITLE: Install Dependencies and Bootstrap Example App
DESCRIPTION: After creating the native module project, navigate into the module's directory and run this command to install all necessary dependencies and bootstrap the example application.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/native-modules-setup.md#_snippet_1

LANGUAGE: shell
CODE:

```
yarn
```

---

TITLE: Start React Native Metro Bundler
DESCRIPTION: Starts the Metro bundler, which packages JavaScript code for React Native apps. This is a prerequisite for running the app.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/_getting-started-linux-android.md#_snippet_4

LANGUAGE: shell
CODE:

```
npx react-native start
```

---

TITLE: Start Metro Bundler
DESCRIPTION: Starts the Metro Bundler, which is essential for building and running React Native applications. It bundles JavaScript code and its dependencies.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/_getting-started-macos-ios.md#_snippet_9

LANGUAGE: shell
CODE:

```
npx react-native start
```

---

TITLE: Start Metro Bundler
DESCRIPTION: Starts the Metro JavaScript bundler, which is essential for running React Native applications. Metro bundles your JavaScript code and its dependencies.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-macos-ios.md#_snippet_6

LANGUAGE: shell
CODE:

```
npm start
```

LANGUAGE: shell
CODE:

```
yarn start
```

---

TITLE: Install Specific React Native Version
DESCRIPTION: Creates a new React Native project with a specified version of React Native.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/_getting-started-macos-ios.md#_snippet_2

LANGUAGE: shell
CODE:

```
npx react-native@X.XX.X init AwesomeProject --version X.XX.X
```

---

TITLE: Start React Native App with npm
DESCRIPTION: Executes the script to start the React Native application using npm. This command initiates the Metro Bundler and builds/runs the app on an Android emulator.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-windows-android.md#_snippet_9

LANGUAGE: shell
CODE:

```
npm run android
```

---

TITLE: Start Metro Bundler
DESCRIPTION: Starts the Metro, the JavaScript bundler for React Native. Metro bundles all your JavaScript code and dependencies into a single file for the application. This command should be run in the root of your React Native project.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.70/_getting-started-macos-ios.md#_snippet_5

LANGUAGE: shell
CODE:

```
npx react-native start
```

---

TITLE: Initialize New React Native Project
DESCRIPTION: Creates a new React Native project using the built-in CLI via npx. This command initializes a project named 'AwesomeProject'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-linux-android.md#_snippet_1

LANGUAGE: shell
CODE:

```
npx react-native@latest init AwesomeProject
```

---

TITLE: Start React Native App with Yarn
DESCRIPTION: Executes the script to start the React Native application using Yarn. This command initiates the Metro Bundler and builds/runs the app on an Android emulator.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-windows-android.md#_snippet_10

LANGUAGE: shell
CODE:

```
yarn android
```

---

TITLE: Basic React Navigation Setup
DESCRIPTION: Example of setting up a basic navigator with two screens (Home and Profile) using React Navigation's native stack.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.79/navigation.md#_snippet_5

LANGUAGE: tsx
CODE:

```
import * as React from 'react';
import {createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {title: 'Welcome'},
    },
    Profile: {
      screen: ProfileScreen,
    },
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

---

TITLE: Basic React Navigation Setup
DESCRIPTION: Example of setting up a basic navigator with two screens (Home and Profile) using React Navigation's native stack.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.81/navigation.md#_snippet_5

LANGUAGE: tsx
CODE:

```
import * as React from 'react';
import {createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {title: 'Welcome'},
    },
    Profile: {
      screen: ProfileScreen,
    },
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

---

TITLE: Initialize New React Native Project
DESCRIPTION: Creates a new React Native project using the CLI. Requires Node.js and npx. Initializes a project named 'AwesomeProject'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/_getting-started-linux-android.md#_snippet_2

LANGUAGE: shell
CODE:

```
npx react-native@latest init AwesomeProject
```

---

TITLE: Basic React Navigation Setup
DESCRIPTION: Example of setting up a basic navigator with two screens (Home and Profile) using React Navigation's native stack.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.78/navigation.md#_snippet_5

LANGUAGE: tsx
CODE:

```
import * as React from 'react';
import {createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {title: 'Welcome'},
    },
    Profile: {
      screen: ProfileScreen,
    },
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

---

TITLE: iOS Dependency Installation
DESCRIPTION: Installs necessary dependencies for iOS development using Bundler and CocoaPods. Navigate to the 'ios' directory first.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.81/get-started-without-a-framework.md#_snippet_6

LANGUAGE: shell
CODE:

```
cd ios
bundle install
bundle exec pod install
```

---

TITLE: Basic React Navigation Setup
DESCRIPTION: Example of setting up a basic navigator with two screens (Home and Profile) using React Navigation's native stack.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.76/navigation.md#_snippet_5

LANGUAGE: tsx
CODE:

```
import * as React from 'react';
import {createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {title: 'Welcome'},
    },
    Profile: {
      screen: ProfileScreen,
    },
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

---

TITLE: Start Metro Bundler
DESCRIPTION: Starts the Metro JavaScript bundler, which is essential for building and running React Native applications. This command can be executed using either npm or yarn.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-windows-android.md#_snippet_8

LANGUAGE: shell
CODE:

```
npm start
```

LANGUAGE: shell
CODE:

```
yarn start
```

---

TITLE: iOS Dependency Installation
DESCRIPTION: Installs necessary dependencies for iOS development using Bundler and CocoaPods. Navigate to the 'ios' directory first.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.80/get-started-without-a-framework.md#_snippet_6

LANGUAGE: shell
CODE:

```
cd ios
bundle install
bundle exec pod install
```

---

TITLE: iOS Dependency Installation
DESCRIPTION: Installs necessary dependencies for iOS development using Bundler and CocoaPods. Navigate to the 'ios' directory first.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.76/get-started-without-a-framework.md#_snippet_6

LANGUAGE: shell
CODE:

```
cd ios
bundle install
bundle exec pod install
```

---

TITLE: Initialize Project with Custom Template
DESCRIPTION: Initializes a new React Native project using a custom template. The --template argument specifies the template to use.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-linux-android.md#_snippet_3

LANGUAGE: shell
CODE:

```
npx react-native init AwesomeProject --template <template-name>
```

---

TITLE: Start Metro Bundler
DESCRIPTION: Starts the Metro development server, which is the JavaScript build tool for React Native. It bundles the JavaScript code and serves it to the application. This command is equivalent to Vite or webpack in web development.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/_getting-started-macos-ios.md#_snippet_9

LANGUAGE: shell
CODE:

```
npm start
```

LANGUAGE: shell
CODE:

```
yarn start
```

---

TITLE: Setup React Native Native Module with create-react-native-library
DESCRIPTION: This snippet demonstrates the command-line steps to create a new React Native native module using the create-react-native-library tool. It covers initialization, dependency installation, and running example applications for both Android and iOS platforms.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.70/native-modules-setup.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx create-react-native-library@latest react-native-awesome-module
```

LANGUAGE: shell
CODE:

```
cd react-native-awesome-module
yarn
```

LANGUAGE: shell
CODE:

```
# Android app
yarn example android
# iOS app
yarn example ios
```

---

TITLE: Setup React Native Native Module with create-react-native-library
DESCRIPTION: This snippet demonstrates the command-line steps to create a new React Native native module using the create-react-native-library tool. It covers initialization, dependency installation, and running example applications for both Android and iOS platforms.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/native-modules-setup.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx create-react-native-library@latest react-native-awesome-module
```

LANGUAGE: shell
CODE:

```
cd react-native-awesome-module
yarn
```

LANGUAGE: shell
CODE:

```
# Android app
yarn example android
# iOS app
yarn example ios
```

---

TITLE: Setup React Native Native Module with create-react-native-library
DESCRIPTION: This snippet demonstrates the command-line steps to create a new React Native native module using the create-react-native-library tool. It covers initialization, dependency installation, and running example applications for both Android and iOS platforms.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/native-modules-setup.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx create-react-native-library@latest react-native-awesome-module
```

LANGUAGE: shell
CODE:

```
cd react-native-awesome-module
yarn
```

LANGUAGE: shell
CODE:

```
# Android app
yarn example android
# iOS app
yarn example ios
```

---

TITLE: Create New React Native Project
DESCRIPTION: Initializes a new React Native project named 'AwesomeProject' using the latest stable version of the React Native CLI, executed via npx.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-windows-android.md#_snippet_6

LANGUAGE: shell
CODE:

```
npx react-native@latest init AwesomeProject
```

---

TITLE: Create a New React Native Application
DESCRIPTION: Initializes a new React Native project named 'AwesomeProject' using the latest stable version of the React Native CLI via npx.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/_getting-started-macos-ios.md#_snippet_1

LANGUAGE: shell
CODE:

```
npx react-native@latest init AwesomeProject
```

---

TITLE: Initialize Project with Specific Version
DESCRIPTION: Initializes a new React Native project using a specific version of React Native. Replace X.XX.X with the desired version number.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-linux-android.md#_snippet_2

LANGUAGE: shell
CODE:

```
npx react-native@X.XX.X init AwesomeProject --version X.XX.X
```

---

TITLE: Install iOS Dependencies
DESCRIPTION: Installs Ruby dependencies using Bundler and then installs native iOS dependencies using CocoaPods. This is typically run within the 'ios' directory of a React Native project.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.74/get-started-without-a-framework.md#_snippet_6

LANGUAGE: shell
CODE:

```
cd ios
bundle install
bundle exec pod install
```

---

TITLE: Create and Start React Native Project with npm
DESCRIPTION: Creates a new React Native project named 'AwesomeProject' using npm and starts the development server.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/getting-started.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx create-expo-app AwesomeProject

cd AwesomeProject
npx expo start
```

---

TITLE: Create React Native Project with npm
DESCRIPTION: This snippet demonstrates how to create a new React Native project named 'AwesomeProject' using npm and start the development server. It's part of the Expo Go workflow for quick setup.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.70/getting-started.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx create-expo-app AwesomeProject

cd AwesomeProject
npm start # you can also use: npx expo start
```

---

TITLE: React Native CLI Usage
DESCRIPTION: Demonstrates how to use the React Native command line interface to execute commands.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/_getting-started-macos-ios.md#_snippet_5

LANGUAGE: shell
CODE:

```
npx react-native <command>
```

---

TITLE: Install iOS Dependencies
DESCRIPTION: Installs iOS dependencies using Bundler and CocoaPods. This is typically run after navigating into the 'ios' directory of your React Native project.

SOURCE: https://github.com/facebook/react-native-website/blob/main/docs/get-started-without-a-framework.md#_snippet_6

LANGUAGE: shell
CODE:

```
cd ios
bundle install
bundle exec pod install
```

---

TITLE: Bootstrap Example Project
DESCRIPTION: Installs project dependencies after creating the native module. This command should be run inside the newly created module's directory.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.75/native-modules-setup.md#_snippet_1

LANGUAGE: shell
CODE:

```
yarn
```

---

TITLE: Install iOS Dependencies
DESCRIPTION: Installs iOS dependencies using Bundler and CocoaPods. This is typically run after navigating into the 'ios' directory of your React Native project.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.79/get-started-without-a-framework.md#_snippet_6

LANGUAGE: shell
CODE:

```
cd ios
bundle install
bundle exec pod install
```

---

TITLE: Example: Installing a Specific NetInfo Version
DESCRIPTION: An example of installing a specific version of the '@react-native-community/netinfo' library.

SOURCE: https://github.com/facebook/react-native-website/blob/main/docs/libraries.md#_snippet_9

LANGUAGE: bash
CODE:

```
npm install @react-native-community/netinfo@^2.0.0
```

---

TITLE: Bootstrap Example Project
DESCRIPTION: Installs project dependencies after creating the native module. This command should be run inside the newly created module's directory.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.74/native-modules-setup.md#_snippet_1

LANGUAGE: shell
CODE:

```
yarn
```

---

TITLE: Install iOS Dependencies
DESCRIPTION: Installs iOS dependencies using Bundler and CocoaPods. This is typically run after navigating into the 'ios' directory of your React Native project.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.78/get-started-without-a-framework.md#_snippet_6

LANGUAGE: shell
CODE:

```
cd ios
bundle install
bundle exec pod install
```

---

TITLE: Install iOS Dependencies
DESCRIPTION: Installs iOS dependencies using Bundler and CocoaPods. This is typically run after navigating into the 'ios' directory of your React Native project.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.77/get-started-without-a-framework.md#_snippet_6

LANGUAGE: shell
CODE:

```
cd ios
bundle install
bundle exec pod install
```

---

TITLE: Create New React Native Project
DESCRIPTION: Initializes a new React Native project named "AwesomeProject" using the `npx` command. This command downloads and executes the latest stable React Native CLI to scaffold your project.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.70/_getting-started-macos-ios.md#_snippet_1

LANGUAGE: shell
CODE:

```
npx react-native init AwesomeProject
```

---

TITLE: Start Metro Bundler
DESCRIPTION: Starts the Metro bundler, which is the JavaScript bundler for React Native. It bundles all your code and dependencies into a single JavaScript file for the app.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.70/_getting-started-linux-android.md#_snippet_6

LANGUAGE: shell
CODE:

```
npx react-native start
```

---

TITLE: Install iOS Dependencies
DESCRIPTION: Installs iOS dependencies using Bundler and CocoaPods. This is typically run after navigating into the 'ios' directory of your React Native project.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.75/get-started-without-a-framework.md#_snippet_6

LANGUAGE: shell
CODE:

```
cd ios
bundle install
bundle exec pod install
```

---

TITLE: Example of Installing a Specific Version
DESCRIPTION: An example demonstrating how to install a specific version of the '@react-native-community/netinfo' library, using version 2.0.0.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/libraries.md#_snippet_6

LANGUAGE: Shell
CODE:

```
npm install @react-native-community/netinfo@^2.0.0
```

---

TITLE: Example: Installing a Specific NetInfo Version
DESCRIPTION: An example of installing a specific version of the '@react-native-community/netinfo' library.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.77/libraries.md#_snippet_6

LANGUAGE: bash
CODE:

```
npm install @react-native-community/netinfo@^2.0.0
```

---

TITLE: Example: Installing a Specific NetInfo Version
DESCRIPTION: An example of installing a specific version of the '@react-native-community/netinfo' library.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.79/libraries.md#_snippet_9

LANGUAGE: bash
CODE:

```
npm install @react-native-community/netinfo@^2.0.0
```

---

TITLE: Example: Installing a Specific NetInfo Version
DESCRIPTION: An example of installing a specific version of the '@react-native-community/netinfo' library.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.78/libraries.md#_snippet_6

LANGUAGE: bash
CODE:

```
npm install @react-native-community/netinfo@^2.0.0
```

---

TITLE: Example: Installing a Specific NetInfo Version
DESCRIPTION: An example of installing a specific version of the '@react-native-community/netinfo' library.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.74/libraries.md#_snippet_6

LANGUAGE: bash
CODE:

```
npm install @react-native-community/netinfo@^2.0.0
```

---

TITLE: Example: Installing a Specific NetInfo Version
DESCRIPTION: An example of installing a specific version of the '@react-native-community/netinfo' library.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/libraries.md#_snippet_6

LANGUAGE: bash
CODE:

```
npm install @react-native-community/netinfo@^2.0.0
```

---

TITLE: Example: Installing a Specific NetInfo Version
DESCRIPTION: An example of installing a specific version of the '@react-native-community/netinfo' library.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.81/libraries.md#_snippet_9

LANGUAGE: bash
CODE:

```
npm install @react-native-community/netinfo@^2.0.0
```

---

TITLE: Create and Start React Native Project with Yarn
DESCRIPTION: Creates a new React Native project named 'AwesomeProject' using Yarn and starts the development server.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/getting-started.md#_snippet_1

LANGUAGE: shell
CODE:

```
yarn create expo-app AwesomeProject

cd AwesomeProject
yarn expo start
```

---

TITLE: Android SDK Configuration
DESCRIPTION: Details the process of installing specific Android SDK components and build tools via Android Studio's SDK Manager. This includes installing 'Android SDK Platform 35' and 'Android SDK Build-Tools 35.0.0'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.77/_getting-started-windows-android.md#_snippet_2

LANGUAGE: APIDOC
CODE:

```
Android Studio SDK Manager:

1. Open Android Studio.
2. Go to 'More Actions' > 'SDK Manager' (or Settings > Languages & Frameworks > Android SDK).
3. SDK Platforms Tab:
   - Check 'Show Package Details'.
   - Expand 'Android 15 (VanillaIceCream)'.
   - Ensure 'Android SDK Platform 35' is checked.
   - Ensure 'Intel x86 Atom_64 System Image' or 'Google APIs Intel x86 Atom System Image' is checked.
4. SDK Tools Tab:
   - Check 'Show Package Details'.
   - Expand 'Android SDK Build-Tools'.
   - Ensure '35.0.0' is selected.
5. Click 'Apply' to install.
```

---

TITLE: Android SDK Configuration
DESCRIPTION: Details the process of installing specific Android SDK components and build tools via Android Studio's SDK Manager. This includes installing 'Android SDK Platform 35' and 'Android SDK Build-Tools 35.0.0'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.80/_getting-started-windows-android.md#_snippet_2

LANGUAGE: APIDOC
CODE:

```
Android Studio SDK Manager:

1. Open Android Studio.
2. Go to 'More Actions' > 'SDK Manager' (or Settings > Languages & Frameworks > Android SDK).
3. SDK Platforms Tab:
   - Check 'Show Package Details'.
   - Expand 'Android 15 (VanillaIceCream)'.
   - Ensure 'Android SDK Platform 35' is checked.
   - Ensure 'Intel x86 Atom_64 System Image' or 'Google APIs Intel x86 Atom System Image' is checked.
4. SDK Tools Tab:
   - Check 'Show Package Details'.
   - Expand 'Android SDK Build-Tools'.
   - Ensure '35.0.0' is selected.
5. Click 'Apply' to install.
```

---

TITLE: React Native Next Steps
DESCRIPTION: Guidance on what to do after setting up the development environment, including integrating React Native into existing applications or learning more about React Native.

SOURCE: https://github.com/facebook/react-native-website/blob/main/docs/_getting-started-macos-android.md#_snippet_5

LANGUAGE: APIDOC
CODE:

```
Integration Guide:
  - Link: /integration-with-existing-apps.md
  - Description: Learn how to add React Native code to an existing application.

Introduction to React Native:
  - Link: /getting-started
  - Description: Explore the fundamentals of React Native development.
```

---

TITLE: Install React Native CLI with npx
DESCRIPTION: Demonstrates how to run the React Native Command Line Interface using `npx`. This method downloads and executes the current stable version of the CLI at runtime, avoiding the need for global installation.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/_getting-started-macos-ios.md#_snippet_2

LANGUAGE: shell
CODE:

```
npx react-native <command>
```

---

TITLE: Initialize React Native Project
DESCRIPTION: Creates a new React Native project using the React Native Community CLI. This command initializes a project named 'AwesomeProject'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/docs/get-started-without-a-framework.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx @react-native-community/cli@latest init AwesomeProject
```

---

TITLE: Configure ANDROID_HOME Environment Variable (Shell)
DESCRIPTION: Sets the ANDROID_HOME environment variable and adds necessary directories to the PATH for React Native development. Requires a shell environment and the Android SDK to be installed. Ensures React Native tools can locate the Android SDK and emulator.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-linux-android.md#_snippet_0

LANGUAGE: shell
CODE:

```
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

TITLE: Run React Native App on Android (npm)
DESCRIPTION: Builds and runs the React Native application on an Android device or emulator. This command is executed using npm.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-linux-android.md#_snippet_6

LANGUAGE: shell
CODE:

```
npm run android
```

---

TITLE: Install iOS Simulator in Xcode
DESCRIPTION: Guides on how to install an iOS simulator within Xcode. This allows for testing React Native applications on virtual iOS devices. The process varies slightly between Xcode versions.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/_getting-started-macos-ios.md#_snippet_4

LANGUAGE: text
CODE:

```
For Xcode versions prior to 14.0: Open Xcode > Preferences > Components tab and select a simulator.
For Xcode version 14.0 or greater: Open Xcode > Settings > Platforms tab, click '+', and select 'iOS…'.
```

---

TITLE: Run React Native Application on iOS
DESCRIPTION: Starts your React Native application on the iOS Simulator. This command assumes Metro Bundler is already running in a separate terminal.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-macos-ios.md#_snippet_7

LANGUAGE: shell
CODE:

```
npm run ios
```

LANGUAGE: shell
CODE:

```
yarn ios
```

---

TITLE: Initialize React Native Project with Specific Version
DESCRIPTION: Initializes a new React Native project with a specified version. Uses the `--version` flag for version control.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/_getting-started-linux-android.md#_snippet_3

LANGUAGE: shell
CODE:

```
npx react-native@X.XX.X init AwesomeProject --version X.XX.X
```

---

TITLE: Install Xcode Command Line Tools
DESCRIPTION: Instructions for installing Xcode Command Line Tools, which are necessary for building iOS applications. This is typically done through Xcode's preferences menu.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/_getting-started-macos-ios.md#_snippet_3

LANGUAGE: text
CODE:

```
Open Xcode, go to Preferences > Locations, and select the most recent version in the Command Line Tools dropdown.
```

---

TITLE: Android Virtual Device (AVD) Creation
DESCRIPTION: This section outlines the process of creating an Android Virtual Device (AVD) using Android Studio. It guides users through selecting a device definition, choosing a system image (specifically VanillaIceCream API Level 35), and installing necessary components like HAXM.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.81/_getting-started-windows-android.md#_snippet_6

LANGUAGE: APIDOC
CODE:

```
Android Studio AVD Manager:
  - Access the AVD Manager via its icon in Android Studio.
  - Create New Virtual Device: Select 'Create Virtual Device...'.
  - Device Selection: Choose any Phone from the list and click 'Next'.
  - System Image Selection: Select the 'VanillaIceCream' API Level 35 image.
  - HAXM Installation: If HAXM is not installed, click 'Install HAXM' or follow the provided installation instructions.
  - Finalize: Click 'Next' then 'Finish' to create the AVD.
  - Launch AVD: Click the green triangle button next to the created AVD to launch it.
```

---

TITLE: Create New React Native Application
DESCRIPTION: Demonstrates the recommended way to create a new React Native project using `npx`, which ensures the latest stable CLI version is used without global installation. This command initializes a project named 'AwesomeProject'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.70/_getting-started-windows-android.md#_snippet_5

LANGUAGE: shell
CODE:

```
npx react-native init AwesomeProject
```

---

TITLE: Android Virtual Device (AVD) Creation
DESCRIPTION: This section outlines the process of creating an Android Virtual Device (AVD) using Android Studio. It guides users through selecting a device definition, choosing a system image (specifically VanillaIceCream API Level 35), and installing necessary components like HAXM.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.80/_getting-started-windows-android.md#_snippet_6

LANGUAGE: APIDOC
CODE:

```
Android Studio AVD Manager:
  - Access the AVD Manager via its icon in Android Studio.
  - Create New Virtual Device: Select 'Create Virtual Device...'.
  - Device Selection: Choose any Phone from the list and click 'Next'.
  - System Image Selection: Select the 'VanillaIceCream' API Level 35 image.
  - HAXM Installation: If HAXM is not installed, click 'Install HAXM' or follow the provided installation instructions.
  - Finalize: Click 'Next' then 'Finish' to create the AVD.
  - Launch AVD: Click the green triangle button next to the created AVD to launch it.
```

---

TITLE: Create New Expo App
DESCRIPTION: This command initializes a new React Native project using the Expo CLI. It sets up the necessary files and dependencies for an Expo-managed application, allowing you to start developing quickly.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.79/getting-started.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx create-expo-app@latest
```

---

TITLE: Run React Native Application on iOS
DESCRIPTION: Builds and runs the React Native application on an iOS simulator. This command starts the app after Metro Bundler is running.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/_getting-started-macos-ios.md#_snippet_10

LANGUAGE: shell
CODE:

```
npx react-native run-ios
```

---

TITLE: Create New Expo App
DESCRIPTION: This command initializes a new React Native project using the Expo CLI. It sets up the necessary files and dependencies for an Expo-managed application, allowing you to start developing quickly.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.77/getting-started.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx create-expo-app@latest
```

---

TITLE: React Native Next Steps
DESCRIPTION: Guidance on what to do after setting up the development environment, including integrating React Native into existing applications or learning more about React Native.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.79/_getting-started-macos-android.md#_snippet_5

LANGUAGE: APIDOC
CODE:

```
Integration Guide:
  - Link: /integration-with-existing-apps.md
  - Description: Learn how to add React Native code to an existing application.

Introduction to React Native:
  - Link: /getting-started
  - Description: Explore the fundamentals of React Native development.
```

---

TITLE: React Native Next Steps
DESCRIPTION: Guidance on what to do after setting up the development environment, including integrating React Native into existing applications or learning more about React Native.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.80/_getting-started-macos-android.md#_snippet_5

LANGUAGE: APIDOC
CODE:

```
Integration Guide:
  - Link: /integration-with-existing-apps.md
  - Description: Learn how to add React Native code to an existing application.

Introduction to React Native:
  - Link: /getting-started
  - Description: Explore the fundamentals of React Native development.
```

---

TITLE: Run React Native App on Android (yarn)
DESCRIPTION: Builds and runs the React Native application on an Android device or emulator. This command is executed using yarn.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-linux-android.md#_snippet_7

LANGUAGE: shell
CODE:

```
yarn android
```

---

TITLE: Create New Expo App
DESCRIPTION: This command initializes a new React Native project using the Expo CLI. It sets up the necessary files and dependencies for an Expo-managed application, allowing you to start developing quickly.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.74/getting-started.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx create-expo-app@latest
```

---

TITLE: Initialize New React Native Project
DESCRIPTION: Creates a new React Native project using the latest version of the React Native CLI. This command sets up the basic project structure and dependencies.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/_getting-started-macos-ios.md#_snippet_5

LANGUAGE: shell
CODE:

```
npx react-native@latest init AwesomeProject
```

---

TITLE: Run React Native Application on iOS
DESCRIPTION: Launches the React Native application on the iOS Simulator. This command assumes the Metro Bundler is already running. It packages the JavaScript code and deploys it to the simulator.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/_getting-started-macos-ios.md#_snippet_10

LANGUAGE: shell
CODE:

```
npm run ios
```

LANGUAGE: shell
CODE:

```
yarn ios
```

---

TITLE: React Native Next Steps
DESCRIPTION: Guidance on what to do after setting up the development environment, including integrating React Native into existing applications or learning more about React Native.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.81/_getting-started-macos-android.md#_snippet_6

LANGUAGE: APIDOC
CODE:

```
Integration Guide:
  - Link: /integration-with-existing-apps.md
  - Description: Learn how to add React Native code to an existing application.

Introduction to React Native:
  - Link: /getting-started
  - Description: Explore the fundamentals of React Native development.
```

---

TITLE: Create React Native Project with Specific Version
DESCRIPTION: Creates a new React Native project, specifying a particular version of the React Native CLI to be used during initialization.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-windows-android.md#_snippet_7

LANGUAGE: shell
CODE:

```
npx react-native@X.XX.X init AwesomeProject --version X.XX.X
```

---

TITLE: Start Metro Bundler
DESCRIPTION: Starts the Metro bundler, which is essential for building and running React Native applications. It bundles your JavaScript code and its dependencies.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/_getting-started-windows-android.md#_snippet_6

LANGUAGE: shell
CODE:

```
npx react-native start
```

---

TITLE: Verify ANDROID_HOME Environment Variable
DESCRIPTION: Checks if the ANDROID_HOME environment variable is correctly set in the current PowerShell session. This is a crucial step for Android development setup.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-windows-android.md#_snippet_4

LANGUAGE: powershell
CODE:

```
Get-ChildItem -Path Env:\
```

---

TITLE: Configure Android SDK and Build Tools
DESCRIPTION: Details on configuring the Android SDK within Android Studio. This includes selecting specific SDK Platforms, System Images, and Build Tools versions required for React Native development.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-windows-android.md#_snippet_2

LANGUAGE: APIDOC
CODE:

```
Android Studio SDK Manager Configuration:

1.  **SDK Platforms Tab**:
    -   Check 'Show Package Details'.
    -   Expand 'Android 13 (Tiramisu)' entry.
    -   Ensure 'Android SDK Platform 33' is checked.
    -   Ensure 'Intel x86 Atom_64 System Image' or 'Google APIs Intel x86 Atom System Image' is checked.

2.  **SDK Tools Tab**:
    -   Check 'Show Package Details'.
    -   Expand 'Android SDK Build-Tools' entry.
    -   Ensure '33.0.0' is selected.

Click 'Apply' to install selected components.
```

---

TITLE: Initialize React Native Project
DESCRIPTION: Creates a new React Native project using the React Native Community CLI. This command initializes a project named 'AwesomeProject'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.77/get-started-without-a-framework.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx @react-native-community/cli@latest init AwesomeProject
```

---

TITLE: Install iOS Dependencies with CocoaPods
DESCRIPTION: Installs Ruby dependencies and CocoaPods for iOS projects. This involves navigating to the 'ios' directory and running bundle install followed by pod install.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-macos-ios.md#_snippet_2

LANGUAGE: shell
CODE:

```
cd ios
bundle install
bundle exec pod install
```

---

TITLE: Create and Start Expo App
DESCRIPTION: Creates a new React Native project using Expo and starts the development server, supporting both npm and yarn package managers.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/getting-started.md#_snippet_0

LANGUAGE: npm
CODE:

```
npx create-expo-app AwesomeProject

cd AwesomeProject
npx expo start
```

LANGUAGE: yarn
CODE:

```
yarn create-expo-app AwesomeProject

cd AwesomeProject
yarn expo start
```

---

TITLE: Run React Native CLI with npx
DESCRIPTION: Executes the React Native command-line interface using npx, which downloads and runs the latest stable version. This is the recommended way to interact with the React Native CLI.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/_getting-started-linux-android.md#_snippet_1

LANGUAGE: cli
CODE:

```
npx react-native <command>
```

---

TITLE: Initialize React Native Project
DESCRIPTION: Creates a new React Native project using the React Native Community CLI. This command initializes a project named 'AwesomeProject'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.76/get-started-without-a-framework.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx @react-native-community/cli@latest init AwesomeProject
```

---

TITLE: Create and Start Expo App
DESCRIPTION: Creates a new React Native project using Expo and starts the development server, supporting both npm and yarn package managers.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/getting-started.md#_snippet_0

LANGUAGE: npm
CODE:

```
npx create-expo-app AwesomeProject

cd AwesomeProject
npx expo start
```

LANGUAGE: yarn
CODE:

```
yarn create-expo-app AwesomeProject

cd AwesomeProject
yarn expo start
```

---

TITLE: Create React Native Project with Yarn
DESCRIPTION: This snippet shows how to create a new React Native project named 'AwesomeProject' using Yarn and start the development server. This is an alternative to the npm method for users who prefer Yarn.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.70/getting-started.md#_snippet_1

LANGUAGE: shell
CODE:

```
yarn create expo-app AwesomeProject

cd AwesomeProject
yarn start # you can also use: yarn expo start
```

---

TITLE: Initialize React Native Project
DESCRIPTION: Creates a new React Native project using the React Native Community CLI. This command initializes a project named 'AwesomeProject'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.75/get-started-without-a-framework.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx @react-native-community/cli@latest init AwesomeProject
```

---

TITLE: Initialize React Native Project
DESCRIPTION: Creates a new React Native project using the React Native Community CLI. This command initializes a project named 'AwesomeProject'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.78/get-started-without-a-framework.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx @react-native-community/cli@latest init AwesomeProject
```

---

TITLE: Initialize React Native Project
DESCRIPTION: Creates a new React Native project using the React Native Community CLI. This command initializes a project named 'AwesomeProject'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.79/get-started-without-a-framework.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx @react-native-community/cli@latest init AwesomeProject
```

---

TITLE: Start Metro Bundler (npm)
DESCRIPTION: Starts the Metro development server, which is the JavaScript bundler for React Native. This command is used when managing packages with npm.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.81/get-started-without-a-framework.md#_snippet_2

LANGUAGE: shell
CODE:

```
npm start
```

---

TITLE: Initialize React Native Project
DESCRIPTION: Creates a new React Native project using the React Native Community CLI. This command initializes a project named 'AwesomeProject'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.74/get-started-without-a-framework.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx @react-native-community/cli@latest init AwesomeProject
```

---

TITLE: Start Metro Bundler (npm)
DESCRIPTION: Starts the Metro development server, which is the JavaScript bundler for React Native. This command is used when managing packages with npm.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.76/get-started-without-a-framework.md#_snippet_2

LANGUAGE: shell
CODE:

```
npm start
```

---

TITLE: Install iOS Dependencies with Bundler and CocoaPods
DESCRIPTION: Navigates to the `ios` directory, installs Ruby dependencies using Bundler, and then installs CocoaPods dependencies. This sequence is crucial for building iOS applications with React Native.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.70/_getting-started-macos-ios.md#_snippet_2

LANGUAGE: shell
CODE:

```
cd ios
bundle install
bundle exec pod install
```

---

TITLE: Initialize React Native Project
DESCRIPTION: Creates a new React Native project using the React Native Community CLI. This command initializes a project named 'AwesomeProject'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.80/get-started-without-a-framework.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx @react-native-community/cli@latest init AwesomeProject
```

---

TITLE: Start Metro Bundler (npm)
DESCRIPTION: Starts the Metro development server, which is the JavaScript bundler for React Native. This command is used when managing packages with npm.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.80/get-started-without-a-framework.md#_snippet_2

LANGUAGE: shell
CODE:

```
npm start
```

---

TITLE: Initialize React Native Project
DESCRIPTION: Creates a new React Native project using the React Native Community CLI. This command initializes a project named 'AwesomeProject'.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.81/get-started-without-a-framework.md#_snippet_0

LANGUAGE: shell
CODE:

```
npx @react-native-community/cli@latest init AwesomeProject
```

---

TITLE: Install Node and Watchman with Homebrew
DESCRIPTION: Installs Node.js (version 16 or newer recommended) and Watchman, a file watching service, using the Homebrew package manager for macOS.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-macos-ios.md#_snippet_0

LANGUAGE: shell
CODE:

```
brew install node
brew install watchman
```

---

TITLE: Run Example App on Android
DESCRIPTION: Executes the example application for your native module on an Android device or emulator. This command is used after the project has been bootstrapped.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/native-modules-setup.md#_snippet_2

LANGUAGE: shell
CODE:

```
yarn example android
```

---

TITLE: Run Example App on iOS
DESCRIPTION: Executes the example application for your native module on an iOS simulator or device. This command is used after the project has been bootstrapped.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/native-modules-setup.md#_snippet_3

LANGUAGE: shell
CODE:

```
yarn example ios
```

---

TITLE: Start Metro Bundler (npm)
DESCRIPTION: Starts the Metro development server using npm. Metro is the JavaScript build tool for React Native, responsible for bundling and transforming code.

SOURCE: https://github.com/facebook/react-native-website/blob/main/docs/get-started-without-a-framework.md#_snippet_2

LANGUAGE: shell
CODE:

```
npm start
```

---

TITLE: Start Metro Bundler (npm)
DESCRIPTION: Starts the Metro development server using npm. Metro is the JavaScript build tool for React Native, responsible for bundling the code.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.74/get-started-without-a-framework.md#_snippet_2

LANGUAGE: shell
CODE:

```
npm start
```

---

TITLE: Install Node.js LTS and OpenJDK 11 via Chocolatey
DESCRIPTION: Installs Node.js LTS and OpenJDK 11 using the Chocolatey package manager on Windows. This command requires an Administrator Command Prompt.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-windows-android.md#_snippet_0

LANGUAGE: powershell
CODE:

```
choco install -y nodejs-lts microsoft-openjdk11
```

---

TITLE: Install React Navigation Core Packages
DESCRIPTION: Installs the core React Navigation library and the native stack navigator package.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.76/navigation.md#_snippet_1

LANGUAGE: shell
CODE:

```
npm install @react-navigation/native @react-navigation/native-stack
```

---

TITLE: Create React Native App with Specific Version/Template
DESCRIPTION: Initializes a new React Native project, allowing specification of a particular React Native version or a custom project template using CLI arguments.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-macos-ios.md#_snippet_3

LANGUAGE: shell
CODE:

```
npx react-native@X.XX.X init AwesomeProject --version X.XX.X
```

---

TITLE: Install React Navigation Core Packages
DESCRIPTION: Installs the core React Navigation library and the native stack navigator package.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.78/navigation.md#_snippet_1

LANGUAGE: shell
CODE:

```
npm install @react-navigation/native @react-navigation/native-stack
```

---

TITLE: Initialize React Native Project
DESCRIPTION: Creates a new React Native project using the built-in CLI. This command initializes a project named 'AwesomeProject' with the latest stable version of React Native.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.70/_getting-started-linux-android.md#_snippet_3

LANGUAGE: shell
CODE:

```
npx react-native init AwesomeProject
```

---

TITLE: Install React Navigation Core Packages
DESCRIPTION: Installs the core React Navigation library and the native stack navigator package.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.79/navigation.md#_snippet_1

LANGUAGE: shell
CODE:

```
npm install @react-navigation/native @react-navigation/native-stack
```

---

TITLE: macOS Native Development Setup
DESCRIPTION: Guides for setting up native development environments on macOS for both Android and iOS platforms.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/getting-started.md#_snippet_5

LANGUAGE: APIDOC
CODE:

```
GuideMacOSAndroid:
  Description: Setup instructions for developing React Native apps on macOS targeting Android.
  Dependencies: Xcode, Android Studio, JDK
  Steps:
    1. Install Xcode from the Mac App Store.
    2. Install Android Studio and configure the Android SDK.
    3. Set up environment variables (ANDROID_HOME, PATH).

GuideMacOSIOS:
  Description: Setup instructions for developing React Native apps on macOS targeting iOS.
  Dependencies: Xcode
  Steps:
    1. Install Xcode from the Mac App Store.
    2. Install CocoaPods: `sudo gem install cocoapods`
    3. Navigate to the project's `ios` directory and run `pod install`.
```

---

TITLE: Install React Navigation Core Packages
DESCRIPTION: Installs the core React Navigation library and the native stack navigator package.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.81/navigation.md#_snippet_1

LANGUAGE: shell
CODE:

```
npm install @react-navigation/native @react-navigation/native-stack
```

---

TITLE: Install Dependencies and Start Bundler
DESCRIPTION: Installs React Native dependencies using Yarn and starts the Metro bundler for development. This is a crucial step before running the application.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/integration-with-android-fragment.md#_snippet_10

LANGUAGE: bash
CODE:

```
yarn
yarn native
```

---

TITLE: Windows Native Development Setup
DESCRIPTION: Guides for setting up native development environments on Windows for Android. iOS development on Windows requires a Mac.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/getting-started.md#_snippet_6

LANGUAGE: APIDOC
CODE:

```
GuideWindowsAndroid:
  Description: Setup instructions for developing React Native apps on Windows targeting Android.
  Dependencies: Android Studio, JDK
  Steps:
    1. Install Android Studio and configure the Android SDK.
    2. Set up environment variables (ANDROID_HOME, PATH).
    3. Install Node.js and npm/yarn.

UnsupportedWindowsIOS:
  Description: iOS development on Windows is unsupported.
  Recommendation: Use a Mac for iOS development or Expo Go for a cross-platform development experience without native code.
```

---

TITLE: Install Dependencies and Start Bundler
DESCRIPTION: Installs React Native dependencies using Yarn and starts the Metro bundler for development. This is a crucial step before running the application.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.75/integration-with-android-fragment.md#_snippet_10

LANGUAGE: bash
CODE:

```
yarn
yarn native
```

---

TITLE: Install Node.js LTS and OpenJDK 17
DESCRIPTION: Installs the Long Term Support (LTS) version of Node.js and OpenJDK 17 using Chocolatey, a package manager for Windows. Ensure you run this command in an Administrator Command Prompt.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.77/_getting-started-windows-android.md#_snippet_0

LANGUAGE: powershell
CODE:

```
choco install -y nodejs-lts microsoft-openjdk17
```

---

TITLE: macOS Native Development Setup
DESCRIPTION: Instructions for setting up native development environments on macOS for both Android and iOS targets. This section details the necessary steps and configurations for a smooth native build process.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/getting-started.md#_snippet_2

LANGUAGE: markdown
CODE:

```
#### Development OS

<Tabs groupId="os" queryString defaultValue={constants.defaultOs} values={constants.oses} className="pill-tabs">
<TabItem value="macos">

#### Target OS

<Tabs groupId="platform" queryString defaultValue={constants.defaultPlatform} values={constants.platforms} className="pill-tabs">
<TabItem value="android">

[//]: # 'macOS, Android'

<GuideMacOSAndroid/>

</TabItem>
<TabItem value="ios">

[//]: # 'macOS, iOS'

<GuideMacOSIOS/>

</TabItem>
</Tabs>

</TabItem>
</Tabs>
```

---

TITLE: Create New React Native App with npx
DESCRIPTION: Generates a new React Native project named 'AwesomeProject' using the latest stable version of the React Native CLI, executed via npx.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.72/_getting-started-macos-ios.md#_snippet_1

LANGUAGE: shell
CODE:

```
npx react-native@latest init AwesomeProject
```

---

TITLE: Install Node.js LTS and OpenJDK 17
DESCRIPTION: Installs the Long Term Support (LTS) version of Node.js and OpenJDK 17 using Chocolatey, a package manager for Windows. Ensure you run this command in an Administrator Command Prompt.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.80/_getting-started-windows-android.md#_snippet_0

LANGUAGE: powershell
CODE:

```
choco install -y nodejs-lts microsoft-openjdk17
```

---

TITLE: Get Zulu JDK Information
DESCRIPTION: Retrieves information about the installed Zulu JDK Cask, including its version and installation path. This is useful for verifying the installation and locating the JDK.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.81/_getting-started-macos-android.md#_snippet_2

LANGUAGE: shell
CODE:

```
brew info --cask zulu@17
```

---

TITLE: Get Zulu JDK Information
DESCRIPTION: Retrieves information about the installed Zulu JDK Cask, including its version and installation path. This is useful for verifying the installation and locating the JDK.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.76/_getting-started-macos-android.md#_snippet_2

LANGUAGE: shell
CODE:

```
brew info --cask zulu@17
```

---

TITLE: Install iOS Dependencies
DESCRIPTION: Installs necessary Ruby and CocoaPods dependencies for iOS development. This is a crucial step after creating a new project or when encountering iOS build issues.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.71/_getting-started-macos-ios.md#_snippet_7

LANGUAGE: APIDOC
CODE:

```
APIDOC:
  Description: Steps to install iOS dependencies.
  Steps:
    1. Navigate to the 'ios' directory: `cd ios`
    2. Install Bundler dependencies: `bundle install`
       - Note: Ensure a Ruby Version Manager is installed and updated if needed.
    3. Install iOS project dependencies: `bundle exec pod install`
  Dependencies:
    - Ruby
    - Bundler
    - CocoaPods
```

---

TITLE: Install Dependencies
DESCRIPTION: Commands to install project dependencies for both npm and Yarn after setting up a local library.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.75/local-library-setup.md#_snippet_4

LANGUAGE: shell
CODE:

```
npm install
```

LANGUAGE: shell
CODE:

```
yarn install
```

---

TITLE: Start Metro Bundler (npm)
DESCRIPTION: Starts the Metro development server using npm. Metro is the JavaScript bundler for React Native, responsible for transforming and serving the code to the application.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.73/_getting-started-windows-android.md#_snippet_6

LANGUAGE: shell
CODE:

```
npm start
```

---

TITLE: Initialize React Native Project with Specific Version
DESCRIPTION: Creates a new React Native project using a specified version of React Native. Requires `npx` and the desired version number. This command initializes the project structure and dependencies.

SOURCE: https://github.com/facebook/react-native-website/blob/main/website/versioned_docs/version-0.70/_getting-started-macos-ios.md#_snippet_3

LANGUAGE: shell
CODE:

```
npx react-native init AwesomeProject --version X.XX.X
```
