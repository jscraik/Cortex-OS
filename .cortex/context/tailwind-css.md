========================
CODE SNIPPETS
========================
TITLE: Getting Started with Tailwind Plus UI Blocks
DESCRIPTION: Information on how to get started with Tailwind Plus UI Blocks, including setup and usage with different frameworks.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/assets

LANGUAGE: html
CODE:

```
<!-- Example usage of UI Blocks -->
<div class="ui-block">
  <!-- Content -->
</div>
```

LANGUAGE: javascript
CODE:

```
// Example JavaScript for UI Blocks functionality
function initializeUIBlocks() {
  console.log('UI Blocks initialized!');
}
```

LANGUAGE: react
CODE:

```
import React from 'react';

function UIBlockComponent() {
  return (
    <div className="ui-block">
      {/* Content */}
    </div>
  );
}
```

LANGUAGE: vue
CODE:

```
<template>
  <div class="ui-block">
    <!-- Content -->
  </div>
</template>

<script>
export default {
  name: 'UIBlockComponent'
}
</script>
```

---

TITLE: Install Latest Tailwind CSS
DESCRIPTION: Command to update Tailwind CSS to the latest version via npm.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: bash
CODE:

```
npm install tailwindcss@latest
```

---

TITLE: Initial React Stacked List Component Example
DESCRIPTION: Demonstrates a basic React component for displaying a stacked list of items. It includes hardcoded data and a simple `ul` structure, serving as a starting point for adaptation.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: React
CODE:

```
const people = [
  {
    name: 'Calvin Hawkins',
    email: 'calvin.hawkins@example.com',
    image:
      'https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  {
    name: 'Kristen Ramos',
    email: 'kristen.ramos@example.com',
    image:
      'https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  {
    name: 'Ted Fox',
    email: 'ted.fox@example.com',
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
]

export default function Example() {
  return (
    <ul className="divide-y divide-gray-200">
      {people.map((person) => (
        <li key={person.email} className="flex py-4">
          <img className="size-10 rounded-full" src={person.image} alt="" />
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{person.name}</p>
            <p className="text-sm text-gray-500">{person.email}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
```

---

TITLE: Dialog Examples
DESCRIPTION: Provides examples of how to use the dialog component, including basic usage, opening, closing, adding a backdrop, and implementing transitions. Full details and code require a Tailwind Plus license.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/dialog

LANGUAGE: html
CODE:

```
<!-- Basic example -->
<!-- Requires Tailwind Plus license for full code -->

<!-- Opening the dialog -->
<!-- Requires Tailwind Plus license for full code -->

<!-- Closing the dialog -->
<!-- Requires Tailwind Plus license for full code -->

<!-- Adding a backdrop -->
<!-- Requires Tailwind Plus license for full code -->

<!-- Adding transitions -->
<!-- Requires Tailwind Plus license for full code -->
```

---

TITLE: Install Tailwind Plus Elements via npm
DESCRIPTION: This snippet demonstrates how to install the Tailwind Plus Elements library using npm, which is suitable for projects with a build pipeline. After installation, import the library into your root layout.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/using-html

LANGUAGE: bash
CODE:

```
npm install @tailwindplus/elements
```

LANGUAGE: javascript
CODE:

```
import '@tailwindplus/elements';
```

---

TITLE: Marketing UI Blocks
DESCRIPTION: This section details the various marketing-focused UI blocks available, including hero sections, feature sections, pricing tables, headers, newsletters, testimonials, team sections, content sections, logo clouds, FAQs, and footers. It also includes flyout menus and banners.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: html
CODE:

```
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/heroes">Hero Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/feature-sections">Feature Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/pricing">Pricing Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/header">Header Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/newsletter-sections">Newsletter Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/testimonials">Testimonials</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/team-sections">Team Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/content-sections">Content Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/logo-clouds">Logo Clouds</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/faq-sections">FAQs</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/footers">Footers</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/header">Headers</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/elements/flyout-menus">Flyout Menus</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/elements/banners">Banners</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing">Browse all →</a>
```

---

TITLE: E-commerce UI Blocks
DESCRIPTION: This section lists UI blocks designed for e-commerce platforms, including product overviews, product lists, category previews, shopping carts, category filters, product quickviews, product features, store navigation, promo sections, checkout forms, reviews, order summaries, order history, and incentives.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: html
CODE:

```
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/product-overviews">Product Overviews</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/product-lists">Product Lists</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/category-previews">Category Previews</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/shopping-carts">Shopping Carts</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/category-filters">Category Filters</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/product-quickviews">Product Quickviews</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/product-features">Product Features</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/store-navigation">Store Navigation</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/promo-sections">Promo Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/checkout-forms">Checkout Forms</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/reviews">Reviews</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/order-summaries">Order Summaries</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/order-history">Order History</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce/components/incentives">Incentives</a>
<a href="https://tailwindcss.com/plus/ui-blocks/ecommerce">Browse all →</a>
```

---

TITLE: Marketing UI Blocks Overview
DESCRIPTION: Provides links to various marketing-focused UI blocks, including Hero Sections, Feature Sections, Pricing Sections, Headers, Footers, and more. Each link directs to detailed documentation and examples for specific marketing components.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/autocomplete

LANGUAGE: html
CODE:

```
<!-- Marketing UI Blocks -->
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/heroes">Hero Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/feature-sections">Feature Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/pricing">Pricing Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/header">Header Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/newsletter-sections">Newsletter Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/testimonials">Testimonials</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/team-sections">Team Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/content-sections">Content Sections</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/logo-clouds">Logo Clouds</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/faq-sections">FAQs</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/sections/footers">Footers</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/elements/flyout-menus">Flyout Menus</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing/elements/banners">Banners</a>
<a href="https://tailwindcss.com/plus/ui-blocks/marketing">Browse all →</a>
```

---

TITLE: Install Dependencies for Tailwind Plus Vue Projects
DESCRIPTION: Provides the npm command to install essential libraries for Tailwind Plus Vue projects. This includes Headless UI for interactive behavior and Heroicons for icons.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: npm
CODE:

```
npm install @headlessui/vue @heroicons/vue
```

---

TITLE: Install Tailwind Plus Elements via CDN
DESCRIPTION: This snippet shows how to install the Tailwind Plus Elements library using a CDN link in the project's head tag. This is the easiest way to integrate the library.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/elements

LANGUAGE: html
CODE:

```
<script src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1" type="module"></script>
```

---

TITLE: Vue Stacked List Component Example
DESCRIPTION: This Vue component demonstrates a simple stacked list of people, including their name, email, and image. Data is provided via a local JavaScript array within the script setup, serving as a starting point for integration into larger projects. It showcases basic Vue templating with `v-for` and Tailwind CSS for styling.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: Vue
CODE:

```
<template>
  <ul class="divide-y divide-gray-200">
    <li v-for="person in people" :key="person.email" class="flex py-4">
      <img class="size-10 rounded-full" :src="person.image" alt="" />
      <div class="ml-3">
        <p class="text-sm font-medium text-gray-900">{{ person.name }}</p>
        <p class="text-sm text-gray-500">{{ person.email }}</p>
      </div>
    </li>
  </ul>
</template>

<script>
  const people = [
    {
      name: 'Calvin Hawkins',
      email: 'calvin.hawkins@example.com',
      image:
        'https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
    {
      name: 'Kristen Ramos',
      email: 'kristen.ramos@example.com',
      image:
        'https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
    {
      name: 'Ted Fox',
      email: 'ted.fox@example.com',
      image:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
  ]

  export default {
    setup() {
      return {
        people,
      }
    },
  }
</script>

```

---

TITLE: Install Tailwind Plus Vue Dependencies
DESCRIPTION: Installs the necessary dependencies for Tailwind Plus UI Blocks when using Vue. This includes Headless UI for interactive behavior and Heroicons for icons.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/using-vue

LANGUAGE: bash
CODE:

```
npm install @headlessui/vue @heroicons/vue
```

---

TITLE: Disclosure Examples
DESCRIPTION: Illustrates various use cases for the Disclosure component, including basic usage, opening, closing, toggling, and adding transitions. Note: Full documentation requires a Tailwind Plus license.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/disclosure

LANGUAGE: html
CODE:

```
<!-- Basic example -->
<!-- To view the complete documentation, you must own a Tailwind Plus license and be signed in -->

<!-- Opening a disclosure -->
<!-- To view the complete documentation, you must own a Tailwind Plus license and be signed in -->

<!-- Closing a disclosure -->
<!-- To view the complete documentation, you must own a Tailwind Plus license and be signed in -->

<!-- Toggling a disclosure -->
<!-- To view the complete documentation, you must own a Tailwind Plus license and be signed in -->

<!-- Adding transitions -->
<!-- To view the complete documentation, you must own a Tailwind Plus license and be signed in -->
```

---

TITLE: Install Tailwind Plus React Dependencies
DESCRIPTION: Installs Headless UI and Heroicons, which are required for Tailwind Plus React components. Ensure you are using React version 18 or higher.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/using-react

LANGUAGE: bash
CODE:

```
npm install @headlessui/react @heroicons/react
```

---

TITLE: Install React Dependencies for Tailwind Plus and Headless UI
DESCRIPTION: This command installs the necessary React dependencies, `@headlessui/react` and `@heroicons/react`, required for using Tailwind Plus in a React project. These libraries power interactive behaviors and provide icons. React version 16 or higher is required.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: bash
CODE:

```
npm install @headlessui/react @heroicons/react
```

---

TITLE: Application UI Blocks
DESCRIPTION: This section covers UI blocks for application interfaces, including tables, feeds, form layouts, select menus, radio groups, checkboxes, comboboxes, navbars, pagination, sidebar navigation, command palettes, modals, dropdowns, and buttons.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: html
CODE:

```
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/lists/tables">Tables</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/lists/feeds">Feeds</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/forms/form-layouts">Form Layouts</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/forms/select-menus">Select Menus</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/forms/radio-groups">Radio Groups</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/forms/checkboxes">Checkboxes</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/forms/comboboxes">Comboboxes</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/navbars">Navbars</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/pagination">Pagination</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/sidebar-navigation">Sidebar Navigation</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/command-palettes">Command Palettes</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/overlays/modal-dialogs">Modals</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/elements/dropdowns">Dropdowns</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/elements/buttons">Buttons</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui">Browse all →</a>
```

---

TITLE: Stacked List Component Example (React)
DESCRIPTION: A basic React component demonstrating a stacked list of people with their names, emails, and images. It uses local data and Tailwind CSS classes for styling. This serves as a starting point for creating more complex UI elements.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/using-react

LANGUAGE: jsx
CODE:

```
const people = [
  {
    name: 'Calvin Hawkins',
    email: 'calvin.hawkins@example.com',
    image: 'https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  {
    name: 'Kristen Ramos',
    email: 'kristen.ramos@example.com',
    image: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  {
    name: 'Ted Fox',
    email: 'ted.fox@example.com',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
]

export default function Example() {
  return (
    <ul className="divide-y divide-gray-200">{people.map((person) => (
        <li key={person.email} className="flex py-4"><img className="size-10 rounded-full" src={person.image} alt="" /><div className="ml-3"><p className="text-sm font-medium text-gray-900">{person.name}</p><p className="text-sm text-gray-500">{person.email}</p></div></li>
      ))}</ul>
  )
}
```

---

TITLE: Install Tailwind Plus Elements via npm
DESCRIPTION: This snippet demonstrates how to install the Tailwind Plus Elements library using npm, a package manager for Node.js. It also shows how to import the library into your project's root layout.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/elements

LANGUAGE: bash
CODE:

```
npm install @tailwindplus/elements
```

LANGUAGE: javascript
CODE:

```
import '@tailwindplus/elements';
```

---

TITLE: Install Tailwind Plus Elements via CDN
DESCRIPTION: This snippet shows how to include the Tailwind Plus Elements library in your project's HTML `<head>` using a CDN link. This enables interactive behavior for UI components.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/using-html

LANGUAGE: html
CODE:

```
<script src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1" type="module"></script>
```

---

TITLE: Enable Dark Mode Support
DESCRIPTION: HTML element configuration for enabling dark mode with Tailwind Plus UI Blocks, including setting default background colors.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: html
CODE:

```
<html class="bg-white dark:bg-gray-950 scheme-light dark:scheme-dark">

```

---

TITLE: Add Inter Font Family via CDN
DESCRIPTION: HTML link tag to include the Inter font from a CDN.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: html
CODE:

```
<link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
```

---

TITLE: Component API Documentation
DESCRIPTION: Provides API documentation for UI Block components, including details on elements like <el-popover> and <el-popover-group>. This section covers component usage, properties, and examples.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/popover

LANGUAGE: APIDOC
CODE:

```
Component API:
  - <el-popover>
    - Description: A component for displaying popover content.
    - Usage: Can be toggled, positioned, and have transitions applied.
    - Related: <el-popover-group>

  - <el-popover-group>
    - Description: A component for grouping related popovers.
    - Usage: Useful for managing multiple popovers in a coordinated manner.
    - Related: <el-popover>

Examples:
  - Basic example
  - Toggling popovers
  - Opening popovers
  - Closing popovers
  - Setting the panel width
  - Positioning the panel
  - Adding transitions
  - Grouping related popovers
```

---

TITLE: Dropdown Menu Component API
DESCRIPTION: Documentation for the Dropdown Menu component, including its API reference for <el-dropdown> and <el-menu> elements, and usage examples.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/dropdown-menu

LANGUAGE: APIDOC
CODE:

```
Component API:
  - <el-dropdown>
  - <el-menu>

Usage Examples:
  - Basic example
  - Using with buttons
  - Using with links
  - Disabling an item
  - Setting the dropdown width
  - Positioning the dropdown
  - Adding transitions
```

---

TITLE: Command Palette API Documentation
DESCRIPTION: API documentation for the command palette component and its related elements. This includes details on usage, customization, and examples for various scenarios like handling no results, grouping commands, and customizing filter logic.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/command-palette

LANGUAGE: APIDOC
CODE:

```
Component API:
  Provides an interface for interacting with the command palette component.

<el-command-palette>:
  The main command palette component.
  Usage:
    Renders a searchable list of commands.

<el-command-list>:
  Component for displaying a list of commands within the palette.

<el-defaults>:
  Component to display default commands when the palette is empty or no search is performed.

<el-command-group>:
  Component for grouping related commands together for better organization.

<el-no-results>:
  Component displayed when no commands match the user's search query.

<el-command-preview>:
  Component to show a preview of a selected command's details or output.

Examples:
  Basic example:
    Demonstrates the fundamental usage of the command palette.
  Opening and closing:
    Illustrates how to programmatically open and close the command palette.
  Using with buttons:
    Shows how to trigger the command palette using buttons.
  Using with links:
    Demonstrates integrating the command palette with links.
  Showing option previews:
    Details on how to display previews for command options.
  Showing default commands:
    Explains how to configure and display default commands.
  Handling no results:
    Provides guidance on managing and displaying messages when no search results are found.
  Grouping related commands:
    Details on how to group commands logically within the palette.
  Customizing the filter logic:
    Explains how to implement custom filtering mechanisms for commands.
```

---

TITLE: Application UI Blocks Overview
DESCRIPTION: Provides links to various application UI components, including Tables, Feeds, Form Layouts, Select Menus, Radio Groups, Checkboxes, Comboboxes, Navbars, Pagination, Sidebar Navigation, Command Palettes, Modals, Dropdowns, and Buttons. Each link leads to specific documentation and examples.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/autocomplete

LANGUAGE: html
CODE:

```
<!-- Application UI Blocks -->
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/lists/tables">Tables</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/lists/feeds">Feeds</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/forms/form-layouts">Form Layouts</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/forms/select-menus">Select Menus</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/forms/radio-groups">Radio Groups</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/forms/checkboxes">Checkboxes</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/forms/comboboxes">Comboboxes</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/navbars">Navbars</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/pagination">Pagination</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/sidebar-navigation">Sidebar Navigation</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/command-palettes">Command Palettes</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/overlays/modal-dialogs">Modals</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/elements/dropdowns">Dropdowns</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui/elements/buttons">Buttons</a>
<a href="https://tailwindcss.com/plus/ui-blocks/application-ui">Browse all →</a>
```

---

TITLE: Configure Inter Font in Tailwind CSS v4.1+
DESCRIPTION: CSS variables to set the Inter font as the default sans-serif font in Tailwind CSS v4.1+.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: css
CODE:

```
@theme {
  --font-sans: InterVariable, sans-serif;
  --font-sans--font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
}
```

---

TITLE: Implement Alpine.js Transitions with x-transition Directive
DESCRIPTION: This example demonstrates how to apply the defined Tailwind CSS transition classes using Alpine.js's `x-transition` directive. It shows how to control element visibility and apply specific classes for enter and leave transitions, ensuring smooth UI animations. Users should also consult WAI-ARIA practices for accessibility.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: html
CODE:

```
<div x-data="{ isOpen: false }" class="relative ...">
  <button type="button" @click="isOpen = !isOpen" class="...">Options</button>

  <div
    x-show="isOpen"
    x-transition:enter="transition ease-out duration-100 transform"
    x-transition:enter-start="opacity-0 scale-95"
    x-transition:enter-end="opacity-100 scale-100"
    x-transition:leave="transition ease-in duration-75 transform"
    x-transition:leave-start="opacity-100 scale-100"
    x-transition:leave-end="opacity-0 scale-95"
    class="absolute right-0 mt-2 w-56 origin-top-right rounded-md shadow-lg"
  >
    <div class="rounded-md bg-white shadow-xs">
      <!-- Snipped  -->
    </div>
  </div>
</div>
```

---

TITLE: Configure Inter Font in Tailwind CSS v3.x
DESCRIPTION: JavaScript configuration for tailwind.config.js to set the Inter font as the default sans-serif font in Tailwind CSS v3.x.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: javascript
CODE:

```
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['InterVariable', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  // ...
}
```

---

TITLE: Install Latest Tailwind CSS via npm
DESCRIPTION: This command updates or installs the latest version of Tailwind CSS using npm. It ensures compatibility with Tailwind Plus components, which are designed for Tailwind CSS v4.1.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: npm
CODE:

```
npm install tailwindcss@latest
```

---

TITLE: Implementing Dynamic Classes with Alpine.js
DESCRIPTION: This example shows how to adapt the dynamic class HTML for Alpine.js. It uses `x-data` to manage component state (`isOn`), `@click` for toggling, and `:class` directives to conditionally apply Tailwind CSS classes based on the `isOn` state. It also demonstrates updating ARIA attributes dynamically.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: Alpine.js
CODE:

```
<span
  x-data="{ isOn: false }"
  @click="isOn = !isOn"
  :aria-checked="isOn"
  :class="{'bg-indigo-600': isOn, 'bg-gray-200': !isOn }"
  class="focus:shadow-outline relative inline-block h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none"
  role="checkbox"
  tabindex="0"
>
  <span
    aria-hidden="true"
    :class="{'translate-x-5': isOn, 'translate-x-0': !isOn }"
    class="inline-block size-5 translate-x-0 transform rounded-full bg-white shadow transition duration-200 ease-in-out"
  ></span>
</span>
```

---

TITLE: Disabling the Input Example
DESCRIPTION: Demonstrates how to disable the input functionality within a UI component, likely a select or form element.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/select

LANGUAGE: html
CODE:

```
<template>
  <div>
    <!-- Example of a disabled input, likely within a select component -->
    <input type="text" disabled placeholder="This input is disabled">
  </div>
</template>

<script>
export default {
  name: 'DisabledInputExample'
}
</script>
```

---

TITLE: Refactored React List Component for Reusability
DESCRIPTION: Illustrates how to break down the initial list example into smaller, reusable React components (`HockeyTeamItem`, `HockeyTeamList`). This version accepts data via props, promoting better modularity and integration with external data sources.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: React
CODE:

```
function HockeyTeamItem({ team }) {
  return (
    <li className="flex py-4">
      <img className="size-10 rounded-full" src={team.logo} alt="" />
      <div className="ml-3">
        <p className="text-sm font-medium text-gray-900">{team.name}</p>
        <p className="text-sm text-gray-500">{team.city}</p>
      </div>
    </li>
  )
}

export default function HockeyTeamList({ teams }) {
  return (
    <ul className="divide-y divide-gray-200">
      {teams.map((team) => (
        <HockeyTeamItem key={team.id} team={team} />
      ))}
    </ul>
  )
}
```

---

TITLE: Reusable Hockey Team List Component (React)
DESCRIPTION: An example of refactoring the stacked list component into a more reusable structure. It introduces a `HockeyTeamItem` component for individual team display and a `HockeyTeamList` component to manage the list of teams, accepting a `teams` prop.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/using-react

LANGUAGE: jsx
CODE:

```
function HockeyTeamItem({ team }) {
  return (
    <li className="flex py-4"><img className="size-10 rounded-full" src={team.logo} alt="" /><div className="ml-3"><p className="text-sm font-medium text-gray-900">{team.name}</p><p className="text-sm text-gray-500">{team.city}</p></div></li>
  )
}

export default function HockeyTeamList({ teams }) {
  return (
    <ul className="divide-y divide-gray-200">{teams.map((team) => (
        <HockeyTeamItem key={team.id} team={team} />
      ))}</ul>
  )
}
```

---

TITLE: Add Inter Font Family using CDN Link
DESCRIPTION: This HTML snippet adds the Inter font family to your project by linking to its CDN stylesheet. Using this font ensures consistent UI appearance across different browsers and operating systems, matching the Tailwind Plus examples.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: HTML
CODE:

```
<link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
```

---

TITLE: Configure Inter Font in Tailwind CSS Theme
DESCRIPTION: These code snippets demonstrate how to configure the Inter font family within your Tailwind CSS project. The first example is for Tailwind CSS v4.1 using the @theme directive, while the second shows the configuration for Tailwind CSS v3.x in the tailwind.config.js file.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: CSS
CODE:

```
@theme {
  --font-sans: InterVariable, sans-serif;
}
```

LANGUAGE: JavaScript
CODE:

```
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['InterVariable', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  // ...
}
```

---

TITLE: Vue Refactored Hockey Team List Components
DESCRIPTION: This example illustrates how to refactor the initial stacked list component into two smaller, more reusable Vue components: `HockeyTeamList.vue` and `HockeyTeamListItem.vue`. The `HockeyTeamList` component manages a list of teams, passing individual team data as props to `HockeyTeamListItem` for rendering. This pattern promotes modularity and easier data binding from external sources.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/index

LANGUAGE: Vue
CODE:

```
<!-- HockeyTeamList.vue -->
<template>
  <ul class="divide-y divide-gray-200">
    <HockeyTeamItem v-for="team in teams" :key="team.id" :team="team" />
  </ul>
</template>

<script>
  export default {
    props: {
      teams: Array,
    },
  }
</script>

<!-- HockeyTeamListItem.vue -->
<template>
  <li class="flex py-4">
    <img class="size-10 rounded-full" :src="team.logo" alt="" />
    <div class="ml-3">
      <p class="text-sm font-medium text-gray-900">{{ team.name }}</p>
      <p class="text-sm text-gray-500">{{ team.city }}</p>
    </div>
  </li>
</template>

<script>
  export default {
    props: {
      team: Object,
    },
  }
</script>

```

---

TITLE: Templates and UI Kits
DESCRIPTION: Lists various website templates and UI kits built with Tailwind CSS. These include starter kits and templates for personal websites, landing pages, API references, and more.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/popover

LANGUAGE: html
CODE:

```
<h3>Templates & UI Kits</h3>
  <ul>
    <li><a href="https://tailwindcss.com/plus/templates/catalyst">Catalyst UI Kit</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/spotlight">Personal Website Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/salient">Landing Page Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/protocol">API Reference Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/commit">Changelog Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/primer">Info Product Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/studio">Agency Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/transmit">Podcast Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/pocket">App Marketing Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/syntax">Documentation Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/keynote">Conference Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates">Browse all →</a></li>
  </ul>
```

---

TITLE: Templates and UI Kits
DESCRIPTION: Lists various website templates and UI kits built with Tailwind CSS. These include starter kits and templates for personal websites, landing pages, API references, and more.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/select

LANGUAGE: html
CODE:

```
<h3>Templates & UI Kits</h3>
  <ul>
    <li><a href="https://tailwindcss.com/plus/templates/catalyst">Catalyst UI Kit</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/spotlight">Personal Website Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/salient">Landing Page Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/protocol">API Reference Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/commit">Changelog Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/primer">Info Product Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/studio">Agency Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/transmit">Podcast Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/pocket">App Marketing Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/syntax">Documentation Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/keynote">Conference Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates">Browse all →</a></li>
  </ul>
```

---

TITLE: Templates and UI Kits
DESCRIPTION: Lists various website templates and UI kits built with Tailwind CSS. These include starter kits and templates for personal websites, landing pages, API references, and more.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/dialog

LANGUAGE: html
CODE:

```
<h3>Templates & UI Kits</h3>
  <ul>
    <li><a href="https://tailwindcss.com/plus/templates/catalyst">Catalyst UI Kit</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/spotlight">Personal Website Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/salient">Landing Page Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/protocol">API Reference Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/commit">Changelog Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/primer">Info Product Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/studio">Agency Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/transmit">Podcast Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/pocket">App Marketing Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/syntax">Documentation Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/keynote">Conference Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates">Browse all →</a></li>
  </ul>
```

---

TITLE: Templates and UI Kits
DESCRIPTION: Lists various website templates and UI kits built with Tailwind CSS. These include starter kits and templates for personal websites, landing pages, API references, and more.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/autocomplete

LANGUAGE: html
CODE:

```
<h3>Templates & UI Kits</h3>
  <ul>
    <li><a href="https://tailwindcss.com/plus/templates/catalyst">Catalyst UI Kit</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/spotlight">Personal Website Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/salient">Landing Page Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/protocol">API Reference Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/commit">Changelog Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/primer">Info Product Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/studio">Agency Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/transmit">Podcast Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/pocket">App Marketing Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/syntax">Documentation Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/keynote">Conference Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates">Browse all →</a></li>
  </ul>
```

---

TITLE: Templates and UI Kits
DESCRIPTION: Lists various website templates and UI kits built with Tailwind CSS. These include starter kits and templates for personal websites, landing pages, API references, and more.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/dropdown-menu

LANGUAGE: html
CODE:

```
<h3>Templates & UI Kits</h3>
  <ul>
    <li><a href="https://tailwindcss.com/plus/templates/catalyst">Catalyst UI Kit</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/spotlight">Personal Website Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/salient">Landing Page Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/protocol">API Reference Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/commit">Changelog Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/primer">Info Product Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/studio">Agency Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/transmit">Podcast Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/pocket">App Marketing Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/syntax">Documentation Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates/keynote">Conference Template</a></li>
    <li><a href="https://tailwindcss.com/plus/templates">Browse all →</a></li>
  </ul>
```

---

TITLE: Marketing Sections Overview
DESCRIPTION: Overview of available marketing sections, including Hero Sections, Feature Sections, Pricing Sections, Header Sections, Newsletter Sections, Testimonials, Team Sections, Content Sections, Logo Clouds, FAQs, and Footers.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/command-palette

LANGUAGE: APIDOC
CODE:

```
Marketing Sections:
  Hero Sections: Pre-designed hero components for landing pages.
  Feature Sections: Sections highlighting product or service features.
  Pricing Sections: Components for displaying pricing plans.
  Header Sections: Various header layouts for websites.
  Newsletter Sections: Components for newsletter sign-ups.
  Testimonials: Sections to showcase customer feedback.
  Team Sections: Components for displaying team member information.
  Content Sections: Versatile sections for displaying various types of content.
  Logo Clouds: Components for displaying client or partner logos.
  FAQs: Sections for frequently asked questions.
  Footers: Different footer designs for websites.

Browse all →: Link to view all available marketing components.
```

---

TITLE: Marketing Elements Overview
DESCRIPTION: Overview of available marketing elements, including Flyout Menus and Banners.

SOURCE: https://tailwindcss.com/plus/ui-blocks/documentation/command-palette

LANGUAGE: APIDOC
CODE:

```
Marketing Elements:
  Flyout Menus: Interactive flyout menu components.
  Banners: Various banner designs for promotions or announcements.
```
