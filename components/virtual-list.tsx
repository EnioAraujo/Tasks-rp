"use client"

import type React from "react"

import { useState, useRef, useMemo } from "react"

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
}

export function VirtualList<T>({ items, itemHeight, containerHeight, renderItem, overscan = 5 }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const { visibleItems, totalHeight, offsetY } = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight)
    const visibleEnd = Math.min(visibleStart + Math.ceil(containerHeight / itemHeight), items.length - 1)

    const actualStart = Math.max(0, visibleStart - overscan)
    const actualEnd = Math.min(items.length - 1, visibleEnd + overscan)

    const visibleItems = items.slice(actualStart, actualEnd + 1).map((item, index) => ({
      item,
      index: actualStart + index,
    }))

    return {
      visibleItems,
      totalHeight: items.length * itemHeight,
      offsetY: actualStart * itemHeight,
    }
  }, [items, itemHeight, scrollTop, containerHeight, overscan])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  return (
    <div ref={scrollElementRef} style={{ height: containerHeight, overflow: "auto" }} onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
