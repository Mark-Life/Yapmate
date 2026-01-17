"use client";

import type { ComponentType, ReactNode } from "react";
import { Grid, Stack, Card } from "./layout";
import { DataTable, Metric, Chart } from "./data";
import { TextBlock, List, KeyValue } from "./content";
import { Button, FlashCard, FlashCardDeck } from "./specialized";

type ComponentRegistry = Record<string, ComponentType<{ children?: ReactNode } & Record<string, unknown>>>;

export const componentRegistry: ComponentRegistry = {
  Grid: Grid as ComponentType<{ children?: ReactNode } & Record<string, unknown>>,
  Stack: Stack as ComponentType<{ children?: ReactNode } & Record<string, unknown>>,
  Card: Card as ComponentType<{ children?: ReactNode } & Record<string, unknown>>,
  DataTable: DataTable as ComponentType<{ children?: ReactNode } & Record<string, unknown>>,
  Metric: Metric as ComponentType<{ children?: ReactNode } & Record<string, unknown>>,
  Chart: Chart as ComponentType<{ children?: ReactNode } & Record<string, unknown>>,
  TextBlock: TextBlock as ComponentType<{ children?: ReactNode } & Record<string, unknown>>,
  List: List as ComponentType<{ children?: ReactNode } & Record<string, unknown>>,
  KeyValue: KeyValue as ComponentType<{ children?: ReactNode } & Record<string, unknown>>,
  Button: Button as ComponentType<{ children?: ReactNode } & Record<string, unknown>>,
  FlashCard: FlashCard as ComponentType<{ children?: ReactNode } & Record<string, unknown>>,
  FlashCardDeck: FlashCardDeck as ComponentType<{ children?: ReactNode } & Record<string, unknown>>,
};
