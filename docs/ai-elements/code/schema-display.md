---
source: https://ai-sdk.dev/elements/components/schema-display
scraped: 2026-02-02T09:36:38.762Z
category: code
---

# Schema Display

Display REST API endpoint documentation with parameters, request/response bodies.

The `SchemaDisplay` component visualizes REST API endpoints with HTTP methods, paths, parameters, and request/response schemas.

Create a new post for a specific user. Requires authentication.

The unique identifier of the user

Save as draft instead of publishing
 titlestringrequired
The post title
 contentstringrequired
The post content in markdown format

Tags for categorization
 tags[]string
Additional metadata
 seoTitlestring
SEO optimized title
 seoDescriptionstring
Meta description
 idstringrequired
Post ID
 titlestringrequired contentstringrequired createdAtstringrequired
ISO 8601 timestamp
 idstringrequired namestringrequired avatarstring

## Installation
```
npx ai-elements@latest add schema-display
```

## Features

- Color-coded HTTP methods

- Path parameter highlighting

- Collapsible parameters section

- Request/response body schemas

- Nested object property display

- Required field indicators

## Method Colors

| Method | Color |  |
| `GET` | Green |  |
| `POST` | Blue |  |
| `PUT` | Orange |  |
| `PATCH` | Yellow |  |
| `DELETE` | Red |  |

## Examples

### Basic Usage

List all users

### With Parameters

### With Request/Response Bodies

 titlestringrequired contentstringrequired idstringrequired createdAtstringrequired

### Nested Properties

 idstring namestring titlestringrequired

## Props

###

### SchemaParameter
```
interface SchemaParameter {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  location?: "path" | "query" | "header";
}
```

### SchemaProperty
```
interface SchemaProperty {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  properties?: SchemaProperty[]; // For objects
  items?: SchemaProperty;        // For arrays
}
```

### Subcomponents

- `SchemaDisplayHeader` - Header container

- `SchemaDisplayMethod` - Color-coded method badge

- `SchemaDisplayPath` - Path with highlighted parameters

- `SchemaDisplayDescription` - Description text

- `SchemaDisplayContent` - Content container

- `SchemaDisplayParameters` - Collapsible parameters section

- `SchemaDisplayParameter` - Individual parameter

- `SchemaDisplayRequest` - Collapsible request body

- `SchemaDisplayResponse` - Collapsible response body

- `SchemaDisplayProperty` - Schema property (recursive)

- `SchemaDisplayExample` - Code example block