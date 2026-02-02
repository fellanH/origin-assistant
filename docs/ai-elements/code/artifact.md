---
source: https://ai-sdk.dev/elements/components/artifact
scraped: 2026-02-02T09:36:36.396Z
category: code
---

# Artifact

A container component for displaying generated content like code, documents, or other outputs with built-in actions.

The `Artifact` component provides a structured container for displaying generated content like code, documents, or other outputs with built-in header actions.
```
# Dijkstra's Algorithm implementationimport heapq
def dijkstra(graph, start):    distances = {node: float('inf') for node in graph}    distances[start] = 0    heap = [(0, start)]    visited = set()        while heap:        current_distance, current_node = heapq.heappop(heap)        if current_node in visited:            continue        visited.add(current_node)                for neighbor, weight in graph[current_node].items():            distance = current_distance + weight            if distance                 distances[neighbor] = distance                heapq.heappush(heap, (distance, neighbor))        return distances
# Example graph graph = {    'A': {'B': 1, 'C': 4},    'B': {'A': 1, 'C': 2, 'D': 5},    'C': {'A': 4, 'B': 2, 'D': 1},    'D': {'B': 5, 'C': 1}}
print(dijkstra(graph, 'A'))
```

## Installation
```
npx ai-elements@latest add artifact
```

## Features

- Structured container with header and content areas

- Built-in header with title and description support

- Flexible action buttons with tooltips

- Customizable styling for all subcomponents

- Support for close buttons and action groups

- Clean, modern design with border and shadow

- Responsive layout that adapts to content

- TypeScript support with proper type definitions

- Composable architecture for maximum flexibility

## Examples

### With Code Display
```
# Dijkstra's Algorithm implementationimport heapq
def dijkstra(graph, start):    distances = {node: float('inf') for node in graph}    distances[start] = 0    heap = [(0, start)]    visited = set()        while heap:        current_distance, current_node = heapq.heappop(heap)        if current_node in visited:            continue        visited.add(current_node)                for neighbor, weight in graph[current_node].items():            distance = current_distance + weight            if distance                 distances[neighbor] = distance                heapq.heappush(heap, (distance, neighbor))        return distances
# Example graph graph = {    'A': {'B': 1, 'C': 4},    'B': {'A': 1, 'C': 2, 'D': 5},    'C': {'A': 4, 'B': 2, 'D': 1},    'D': {'B': 5, 'C': 1}}
print(dijkstra(graph, 'A'))
```

## Props

###

###

###

###

###

###

###

###