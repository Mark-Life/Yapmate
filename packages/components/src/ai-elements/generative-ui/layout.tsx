"use client";

import { cn } from "@yapmate/components/lib/utils";
import type { ReactNode } from "react";

export type GridProps = {
  columns: number;
  gap?: number | null;
  children?: ReactNode;
};

export function Grid({ columns, gap, children }: GridProps) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: gap ? `${gap}px` : "1rem",
      }}
    >
      {children}
    </div>
  );
}

export type StackProps = {
  direction: "vertical" | "horizontal";
  gap?: number | null;
  children?: ReactNode;
};

export function Stack({ direction, gap, children }: StackProps) {
  return (
    <div
      className={cn(
        "flex",
        direction === "vertical" ? "flex-col" : "flex-row"
      )}
      style={{ gap: gap ? `${gap}px` : "0.5rem" }}
    >
      {children}
    </div>
  );
}

export type CardProps = {
  title?: string | null;
  subtitle?: string | null;
  children?: ReactNode;
};

export function Card({ title, subtitle, children }: CardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      {(title || subtitle) && (
        <div className="mb-3">
          {title && (
            <h3 className="font-semibold text-card-foreground">{title}</h3>
          )}
          {subtitle && (
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
